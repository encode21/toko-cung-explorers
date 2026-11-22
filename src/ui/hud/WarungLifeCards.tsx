import { useState } from "react";
import { useWarung, warungCommand } from "@/game/warung/store";
import { isWarungOpenAt, rupiah } from "@/game/warung/model";
import { useSceneTime } from "@/game/time/scene-time";
import { useGame } from "@/state/game-store";

const HOURS = Array.from({ length: 24 }, (_, h) => h);
const hh = (h: number) => `${String(h).padStart(2, "0")}:00`;

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
  const gameHour = useSceneTime((s) => s.hour);
  if (!w) return null;
  const openNow = isWarungOpenAt(w.openHour, w.closeHour, gameHour);
  const [open, close] = draft ?? [w.openHour, w.closeHour];
  const changed = open !== w.openHour || close !== w.closeHour;
  return (
    <div className="warung-card warung-life">
      <div className="warung-card-head">
        <strong>Jam buka</strong>
        <span className="warung-level-pill" data-closed={!openNow || rent?.sealed || undefined}>
          {rent?.sealed ? "Disegel" : openNow ? "Buka" : "Tutup"}
        </span>
      </div>
      <div className="warung-hours-row">
        <label>
          Buka
          <select
            value={open}
            disabled={busy}
            onChange={(e) => setDraft([Number(e.target.value), close])}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {hh(h)}
              </option>
            ))}
          </select>
        </label>
        <label>
          Tutup
          <select
            value={close}
            disabled={busy}
            onChange={(e) => setDraft([open, Number(e.target.value)])}
          >
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {hh(h)}
              </option>
            ))}
          </select>
        </label>
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
        Pakai jam dunia (1 hari = 48 menit). Pembeli hanya datang saat buka; jam 22–05 cuma separuh
        ramainya. Makin lama buka, makin besar listrik di tagihan {rent?.landlord ?? "Koko Cung"}
        {rent
          ? ` (sekarang ${rupiah(rent.daily)}/hari asli, jatuh tempo ${hh(rent.dueHour)} WIB)`
          : ""}
        .
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
        <p className="warung-hint">Kas usahamu siap dipakai buka usaha lain.</p>
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
