import { useState } from "react";
import { TrendingUp, MapPin, Check } from "lucide-react";
import { useWarung, warungCommand } from "@/game/warung/store";
import { rupiah } from "@/game/warung/model";
import { HoursCard, RentCard } from "./WarungLifeCards";
import { CityLotQueue, WarungLotCard } from "./WarungLotPicker";

const SECTIONS = [
  { id: "schedule", label: "Jadwal & pegawai" },
  { id: "rent", label: "Sewa" },
  { id: "upgrade", label: "Naik level" },
  { id: "lot", label: "Lokasi" },
] as const;

export function WarungOperations() {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>(() =>
    data?.rent?.owedDays ? "rent" : "schedule",
  );
  const w = data?.warung;
  if (!data || !w) return null;
  const next = data.levels[String(w.level + 1)];
  const canUpgrade = w.nextUpgradeCost !== null && w.cash >= w.nextUpgradeCost;
  return (
    <div className="warung-operations">
      <div className="warung-manager-switch" role="group" aria-label="Pengaturan operasional">
        {SECTIONS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={section === id}
            onClick={() => setSection(id)}
          >
            {id === "rent" ? (data.rent?.text?.["title"] ?? label) : label}
          </button>
        ))}
      </div>
      {section === "schedule" && (
        <div className="warung-list">
          <HoursCard />
          <label className="warung-toggle">
            <input
              type="checkbox"
              checked={w.hiring}
              disabled={busy}
              onChange={(e) => void warungCommand("hire", { hiring: e.target.checked })}
            />
            <span>
              <strong>Buka lowongan part-time</strong>
              <small>Pemain lain bisa melayani pembeli. Upahnya 20% dari penjualan.</small>
            </span>
          </label>
        </div>
      )}
      {section === "rent" &&
        (data.rent?.kind === "gang" || data.rent?.owedDays ? (
          <RentCard />
        ) : (
          <div className="warung-operation-detail">
            <Check size={32} aria-hidden />
            <h4>Tidak ada tunggakan sewa</h4>
            <p>
              {data.rent
                ? `Sewa saat ini ${rupiah(data.rent.daily)}/hari asli. Jatuh tempo pukul ${String(data.rent.dueHour).padStart(2, "0")}.00 WIB.`
                : "Tagihan sewa akan muncul di sini."}
            </p>
          </div>
        ))}
      {section === "upgrade" && (
        <div className="warung-operation-detail">
          <TrendingUp size={40} aria-hidden />
          <h4>{next?.name ?? "Level tertinggi"}</h4>
          <p>
            {w.nextUpgradeCost === null
              ? "Warungmu sudah mencapai level tertinggi."
              : `Kembangkan ${w.levelName} ke level ${w.level + 1}. Biaya diambil dari Kas Warung.`}
          </p>
          {w.nextUpgradeCost !== null && (
            <>
              <strong className="warung-upgrade-cost">{rupiah(w.nextUpgradeCost)}</strong>
              <button
                type="button"
                className="warung-cta"
                disabled={busy || !canUpgrade}
                onClick={() => void warungCommand("upgrade")}
              >
                {busy ? "Memproses…" : canUpgrade ? "Naik level" : "Kas belum cukup"}
              </button>
            </>
          )}
        </div>
      )}
      {section === "lot" && data.cityLots?.enabled && (
        <CityLotQueue
          city={data.cityLots}
          busy={busy}
          onJoin={(tier) => void warungCommand("city_queue_join", { tier })}
          onLeave={() => void warungCommand("city_queue_leave")}
          onAccept={() => void warungCommand("city_offer_accept")}
        />
      )}
      {section === "lot" &&
        (data.lotMarket ? (
          <WarungLotCard
            lots={data.lotMarket}
            cash={w.cash}
            busy={busy}
            onMove={(lot) => void warungCommand("move_lot", { lot })}
          />
        ) : (
          <div className="warung-operation-detail">
            <MapPin size={32} aria-hidden />
            <p>Daftar kavling belum tersedia.</p>
          </div>
        ))}
    </div>
  );
}
