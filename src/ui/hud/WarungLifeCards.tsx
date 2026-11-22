import { useState } from "react";
import { useWarung, warungCommand } from "@/game/warung/store";
import { rupiah } from "@/game/warung/model";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";

const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

/** − / + hour picker (wraps 23 → 00); arrow keys, PageUp/PageDown (±3) on the value. */
function HourStepper({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: number;
  disabled: boolean;
  onChange: (hour: number) => void;
}) {
  const step = (d: number) => onChange((value + d + 24) % 24);
  const keys: Record<string, number> = {
    ArrowUp: 1,
    ArrowRight: 1,
    ArrowDown: -1,
    ArrowLeft: -1,
    PageUp: 3,
    PageDown: -3,
  };
  return (
    <div className="warung-hour-stepper">
      <span id={`hour-${label}`}>{label}</span>
      <div>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label} sejam lebih awal`}
          onClick={() => step(-1)}
        >
          −
        </button>
        <output
          role="spinbutton"
          tabIndex={disabled ? -1 : 0}
          aria-labelledby={`hour-${label}`}
          aria-valuemin={0}
          aria-valuemax={23}
          aria-valuenow={value}
          aria-valuetext={hh(value)}
          aria-disabled={disabled || undefined}
          onKeyDown={(e) => {
            if (disabled || !keys[e.key]) return;
            e.preventDefault();
            step(keys[e.key] ?? 0);
          }}
        >
          {hh(value)}
        </output>
        <button
          type="button"
          disabled={disabled}
          aria-label={`${label} sejam lebih lambat`}
          onClick={() => step(1)}
        >
          +
        </button>
      </div>
    </div>
  );
}

/** Koko Cung's rent bill: only shown when something is owed. */
export function RentCard() {
  const rent = useWarung((s) => s.data?.rent);
  const busy = useWarung((s) => s.busy);
  if (!rent || rent.owedDays < 1) return null;
  return (
    <div className="warung-empty-banner warung-life" data-tone={rent.sealed ? "danger" : "warn"}>
      <div>
        <strong>
          {rent.sealed ? "🔒 Warung disegel " : "🧧 Tagihan sewa dari "}
          {rent.landlord}
        </strong>
        <p className="warung-quote">
          {rent.sealed
            ? `“Sudah ${rent.owedDays} hari nunggak. Lapak saya segel dulu sampai sewa dibayar.”`
            : `“Sewa ${rent.owedDays} hari belum masuk, ya. Nunggak ${rent.sealDays} hari, lapak saya segel.”`}
        </p>
        <p>
          {rent.owedDays} hari × {rupiah(rent.daily)} = <b>{rupiah(rent.owed)}</b>
        </p>
      </div>
      <div className="warung-life-actions">
        <button
          type="button"
          className="warung-cta"
          disabled={busy}
          onClick={() => void warungCommand("pay_rent")}
        >
          Bayar sewa
        </button>
        {rent.canBargain && (
          <button
            type="button"
            className="warung-secondary"
            disabled={busy}
            onClick={() => void warungCommand("rent_bargain")}
          >
            Minta keringanan
          </button>
        )}
      </div>
    </div>
  );
}

/** Opening hours: longer hours mean more buyers but a bigger listrik bill. */
export function HoursCard() {
  const w = useWarung((s) => s.data?.warung);
  const rent = useWarung((s) => s.data?.rent);
  const busy = useWarung((s) => s.busy);
  const [draft, setDraft] = useState<[number, number] | null>(null);
  if (!w) return null;
  const [open, close] = draft ?? [w.openHour, w.closeHour];
  const changed = open !== w.openHour || close !== w.closeHour;
  return (
    <div className="warung-card warung-life">
      <div className="warung-card-head">
        <strong>Jam buka</strong>
        <span className="warung-level-pill" data-closed={!w.isOpen || rent?.sealed || undefined}>
          {rent?.sealed ? "Disegel" : w.isOpen ? "Buka" : "Tutup"}
        </span>
      </div>
      <div className="warung-hours-row">
        <HourStepper
          label="Buka"
          value={open}
          disabled={busy}
          onChange={(h) => setDraft([h, close])}
        />
        <HourStepper
          label="Tutup"
          value={close}
          disabled={busy}
          onChange={(h) => setDraft([open, h])}
        />
        <button
          type="button"
          className="warung-secondary"
          disabled={busy || !changed}
          onClick={() =>
            void warungCommand("hours", { openHour: open, closeHour: close }).then(
              (s) => s && setDraft(null),
            )
          }
        >
          Simpan
        </button>
      </div>
      <p className="warung-hint">
        Pembeli hanya datang saat buka (WIB); jam 22–05 cuma separuh ramainya. Makin lama buka,
        makin besar listrik di tagihan {rent?.landlord ?? "Koko Cung"}
        {rent ? ` (sekarang ${rupiah(rent.daily)}/hari, jatuh tempo ${hh(rent.dueHour)})` : ""}.
      </p>
    </div>
  );
}

/** Current story chapter: who is talking, what to do, and the reward. */
export function StoryCard() {
  const story = useWarung((s) => s.data?.story);
  const busy = useWarung((s) => s.busy);
  if (!story) return null;
  if (story.finished)
    return (
      <div className="warung-card warung-life">
        <strong>📖 Cerita tamat ({story.total} bab)</strong>
        <p className="warung-hint">
          Kas usahamu siap dipakai buka usaha lain: warteg, kos-kosan, atau motor ojek.
        </p>
        <button
          type="button"
          className="warung-cta"
          onClick={() => useHud.getState().setSheet("usaha")}
        >
          Lihat usaha lain
        </button>
      </div>
    );
  const pct = Math.round((story.progress / story.target) * 100);
  return (
    <div className="warung-card warung-life">
      <div className="warung-card-head">
        <strong>
          📖 Bab {story.step + 1}: {story.title}
        </strong>
        <span className="warung-level-pill">
          {story.step + 1}/{story.total}
        </span>
      </div>
      <p className="warung-quote">
        <b>{story.npc}:</b> “{story.intro}”
      </p>
      <div className="warung-life-goal">
        <span>{story.label}</span>
        <span>
          {story.target >= 1000
            ? `${rupiah(story.progress)} / ${rupiah(story.target)}`
            : `${story.progress}/${story.target}`}
        </span>
      </div>
      <div
        className="warung-life-bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
      >
        <i style={{ width: `${pct}%` }} />
      </div>
      <button
        type="button"
        className="warung-cta"
        disabled={busy || !story.done}
        onClick={() =>
          void warungCommand("story_claim").then(
            (s) => s && useGame.getState().setToast(`📖 ${story.npc}: “${story.outro}”`),
          )
        }
      >
        {story.done
          ? `Selesaikan bab · +${rupiah(story.reward)}`
          : `Hadiah ${rupiah(story.reward)}`}
      </button>
    </div>
  );
}
