import { useEffect, useRef, useState } from "react";
import { MapPin, Check } from "lucide-react";
import { StaffPanel } from "@/game/staff/StaffPanel";
import { useWarung, warungCommand } from "@/game/warung/store";
import { rupiah } from "@/game/warung/model";
import { HoursCard, RentCard } from "./WarungLifeCards";
import { CityLotQueue, WarungLotCard } from "./WarungLotPicker";
import { WarungReportCard } from "./WarungReportCard";
import { UpgradeSection } from "./WarungUpgradeSection";

const SECTIONS = [
  { id: "report", label: "Laba/rugi" },
  { id: "schedule", label: "Jadwal & pegawai" },
  { id: "rent", label: "Sewa" },
  { id: "upgrade", label: "Naik level" },
  { id: "lot", label: "Lokasi" },
] as const;

export function WarungOperations() {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const error = useWarung((s) => s.error);
  const bodyRef = useRef<HTMLDivElement>(null);
  const [section, setSection] = useState<(typeof SECTIONS)[number]["id"]>(() =>
    data?.rent?.owedDays ? "rent" : "report",
  );
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: 0 });
  }, [section]);

  const w = data?.warung;
  if (!data || !w) return null;
  return (
    <>
      <div
        className="warung-manager-switch warung-manager-switch--operations"
        role="group"
        aria-label="Pengaturan operasional"
      >
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
      <div ref={bodyRef} className="warung-manager-body warung-operations" data-task="operasional">
        {error && (
          <p className="warung-error" role="alert">
            {error}
          </p>
        )}
        {section === "report" && <WarungReportCard />}
        {section === "schedule" && (
          <>
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
            <StaffPanel business="warung" />
          </>
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
        {section === "upgrade" && <UpgradeSection />}
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
    </>
  );
}
