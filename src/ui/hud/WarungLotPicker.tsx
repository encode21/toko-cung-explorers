import { useState } from "react";
import type { CityLotState, WarungLotOffer } from "@/game/warung/model";
import { rupiah } from "@/game/warung/model";
import { useProfile } from "@/identity/profile-store";
import { useHud } from "@/state/hud-store";
import { useMapFocus } from "@/ui/minimap/map-focus";

const TIER_ORDER = { premium: 0, tengah: 1, pinggir: 2 } as const;

/** Why a lot can't be taken right now, or null when it can. */
function blocked(l: WarungLotOffer, level: number, cash: number | null) {
  if (l.mine) return "Milikmu";
  if (l.status === "exclusive") return "Eksklusif";
  if (l.status === "soon") return "Akan hadir";
  if (l.ownerName) return `Milik ${l.ownerName}`;
  if (level < l.level) return `Butuh Lv.${l.level}`;
  if (cash !== null && cash < l.price) return "Kas kurang";
  return null;
}

/**
 * Kavling board. Premium lots near Toko Cung are one-owner across channels; pinggir/tengah lots are
 * shared, and each channel shows one of their owners in the house.
 */
export function WarungLotPicker({
  lots,
  cash,
  selected,
  busy,
  actionLabel,
  onPick,
}: {
  lots: WarungLotOffer[];
  /** Kas that pays for the lot (start capital when opening). */
  cash: number | null;
  selected?: number | null;
  busy: boolean;
  actionLabel: (l: WarungLotOffer) => string;
  onPick: (l: WarungLotOffer) => void;
}) {
  const level = useProfile((s) => s.profile?.level ?? 1);
  const sorted = [...lots].sort(
    (a, b) => TIER_ORDER[a.tier] - TIER_ORDER[b.tier] || a.price - b.price || a.lot - b.lot,
  );
  return (
    <ul className="warung-rec-items warung-lot-list" aria-label="Pilih kavling">
      {sorted.map((l) => {
        const why = blocked(l, level, cash);
        return (
          <li key={l.lot} data-selected={selected === l.lot || undefined}>
            <span>
              Kavling #{l.lot + 1} · {l.tierName}
              <small>
                {l.price ? rupiah(l.price) : "Gratis"} · Lv.{l.level}
                {l.unique ? " · satu pemilik" : l.owners ? ` · ${l.owners} warung berbagi` : ""}
              </small>
            </span>
            {why ? (
              <b className="warung-demand" data-tone={l.mine ? "good" : "bad"}>
                {why}
              </b>
            ) : (
              <button
                type="button"
                className="warung-secondary"
                disabled={busy}
                aria-pressed={selected === l.lot}
                onClick={() => onPick(l)}
              >
                {actionLabel(l)}
              </button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/** Home card: current kavling and, on demand, the board to buy a better one (paid from Kas, no refund). */
export function WarungLotCard({
  lots,
  cash,
  busy,
  onMove,
}: {
  lots: WarungLotOffer[];
  cash: number;
  busy: boolean;
  onMove: (lot: number) => void;
}) {
  const [open, setOpen] = useState(false);
  const [pick, setPick] = useState<WarungLotOffer | null>(null);
  const mine = lots.find((l) => l.mine);
  return (
    <div className="warung-card warung-life">
      <div className="warung-card-head">
        <strong>Kavling</strong>
        <span className="warung-level-pill">
          {mine ? `#${mine.lot + 1} · ${mine.tierName}` : "Belum ada"}
        </span>
      </div>
      {!open ? (
        <div className="warung-card-actions">
          <button
            type="button"
            className="warung-cta"
            onClick={() => {
              useMapFocus.setState({ lots: true });
              useHud.getState().setSheet("map");
            }}
          >
            Pilih kavling di peta
          </button>
          <button type="button" className="warung-secondary" onClick={() => setOpen(true)}>
            Lihat daftar
          </button>
        </div>
      ) : (
        <>
          <WarungLotPicker
            lots={lots}
            cash={cash}
            selected={pick?.lot ?? null}
            busy={busy}
            actionLabel={(l) => (pick?.lot === l.lot ? "Dipilih" : "Pilih")}
            onPick={(l) => setPick(pick?.lot === l.lot ? null : l)}
          />
          {pick && (
            <button
              type="button"
              className="warung-cta"
              disabled={busy}
              onClick={() => {
                onMove(pick.lot);
                setPick(null);
                setOpen(false);
              }}
            >
              Pindah ke #{pick.lot + 1} · {pick.price ? rupiah(pick.price) : "Gratis"}
            </button>
          )}
          <p className="warung-hint">Kavling lama dilepas tanpa uang kembali. Stok ikut pindah.</p>
        </>
      )}
    </div>
  );
}

/**
 * F7 kavling kota: rent ×multiplier, NPC bonus per tier, and the tier queue. A freed lot is offered to the
 * head of its tier for offerHours; idle or sealed owners go back to their gang home.
 */
export function CityLotQueue({
  city,
  busy,
  onJoin,
  onLeave,
  onAccept,
}: {
  city: CityLotState;
  busy: boolean;
  onJoin: (tier: string) => void;
  onLeave: () => void;
  onAccept: () => void;
}) {
  if (!city.enabled || !city.tiers) return null;
  const q = city.queue;
  return (
    <div className="warung-card warung-life">
      <div className="warung-card-head">
        <strong>Kavling kota</strong>
        <span className="warung-level-pill">Sewa ×{city.rentMultiplier} ke Koko Cung</span>
      </div>
      {q?.status === "offered" && q.lot !== null ? (
        <div className="warung-card-actions">
          <p className="warung-hint">
            Koko Cung menawarkan Kavling #{q.lot + 1}
            {q.expiresAt
              ? ` sampai ${new Date(q.expiresAt).toLocaleString("id-ID", { weekday: "short", hour: "2-digit", minute: "2-digit" })}`
              : ""}
            .
          </p>
          <button type="button" className="warung-cta" disabled={busy} onClick={onAccept}>
            Ambil Kavling #{q.lot + 1}
          </button>
          <button type="button" className="warung-secondary" disabled={busy} onClick={onLeave}>
            Lewati
          </button>
        </div>
      ) : q ? (
        <div className="warung-card-actions">
          <p className="warung-hint">
            Antre kavling {city.tiers.find((t) => t.tier === q.tier)?.name ?? q.tier}
            {q.position ? ` · urutan ke-${q.position}` : ""}. Koko Cung kabari kalau ada yang
            kosong.
          </p>
          <button type="button" className="warung-secondary" disabled={busy} onClick={onLeave}>
            Keluar antrean
          </button>
        </div>
      ) : (
        <ul className="warung-rec-items warung-lot-list" aria-label="Antre kavling kota">
          {city.tiers.map((t) => (
            <li key={t.tier}>
              <span>
                {t.name} · +{t.npcBonusPercent}% pembeli
                <small>
                  {t.price ? `${rupiah(t.price)} · ` : "Gratis · "}
                  {t.missing.length ? "Belum memenuhi syarat" : "Syarat terpenuhi"} · {t.waiting}{" "}
                  antre
                </small>
                {t.requirements?.map((r) => (
                  <small key={r.key} data-ok={r.ok || undefined}>
                    {r.ok ? "✓" : "○"} {r.label}{" "}
                    {r.key === "total_sales"
                      ? `${rupiah(r.have)} / ${rupiah(r.need)}`
                      : `${r.have} / ${r.need}`}
                  </small>
                ))}
              </span>
              {t.missing.length ? (
                <b className="warung-demand" data-tone="bad">
                  Belum bisa
                </b>
              ) : (
                <button
                  type="button"
                  className="warung-secondary"
                  disabled={busy}
                  onClick={() => onJoin(t.tier)}
                >
                  Antre
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="warung-hint">
        Tidak login {city.inactiveDays} hari atau warung disegel: kavling dilepas, warung pulang ke
        rumah gang dengan barang dan kas utuh.
      </p>
    </div>
  );
}
