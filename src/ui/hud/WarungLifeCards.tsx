import { useState } from "react";
import { useWarung, warungCommand } from "@/game/warung/store";
import { isWarungOpenAt, rupiah } from "@/game/warung/model";
import { useSceneTime } from "@/game/time/scene-time";
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

type ChatLine = { from: "koko" | "me"; text: string };

/** Koko Cung's rent bill as a chat: he talks, you pick a reply, he answers. Shown while owed. */
export function RentCard() {
  const rent = useWarung((s) => s.data?.rent);
  const busy = useWarung((s) => s.busy);
  const [thread, setThread] = useState<ChatLine[]>([]);
  if (!rent || rent.owedDays < 1) return null;
  const left = Math.max(0, rent.sealDays - rent.owedDays);
  const opening: ChatLine[] = rent.sealed
    ? [
        { from: "koko", text: `Sudah ${rent.owedDays} hari nunggak. Lapakmu saya segel dulu ya.` },
        { from: "koko", text: `Lunasi ${rupiah(rent.owed)}, segelnya langsung saya buka.` },
      ]
    : [
        { from: "koko", text: `Permisi, sewa ${rent.owedDays} hari belum masuk nih.` },
        {
          from: "koko",
          text: `${rent.owedDays} × ${rupiah(rent.daily)} = ${rupiah(rent.owed)}. ${
            left <= 1 ? "Besok saya segel, lho." : `${left} hari lagi saya segel.`
          }`,
        },
      ];
  const say = (...lines: ChatLine[]) => setThread((t) => [...t, ...lines]);
  const pay = async () => {
    say({ from: "me", text: `Ini Ko, saya bayar ${rupiah(rent.owed)}.` });
    const s = await warungCommand("pay_rent");
    const after = s?.rent?.owedDays ?? rent.owedDays;
    say({
      from: "koko",
      text: !s
        ? (useWarung.getState().error ?? "Kasnya belum cukup kayaknya. Jualan dulu, ya.")
        : after === 0
          ? "Lunas! Makasih, semoga laris manis 🙏"
          : `Masuk ${rent.owedDays - after} hari. Sisanya ${after} hari, jangan lupa ya.`,
    });
  };
  const bargain = async () => {
    say({ from: "me", text: "Ko, minta keringanan dong, lagi sepi nih 🙏" });
    const s = await warungCommand("rent_bargain");
    const after = s?.rent?.owedDays ?? rent.owedDays;
    say({
      from: "koko",
      text: !s
        ? (useWarung.getState().error ?? "Minggu ini sudah minta keringanan, lho.")
        : after < rent.owedDays
          ? "Ya sudah, sehari saya ikhlaskan. Jangan diulang-ulang, ya."
          : "Waduh, saya juga lagi butuh. Bayar sesuai tagihan, ya.",
    });
  };
  return (
    <div
      className="warung-card warung-life warung-chat"
      data-tone={rent.sealed ? "danger" : "warn"}
    >
      <div className="warung-card-head">
        <strong>
          {rent.sealed ? "🔒" : "🧧"} {rent.landlord}
        </strong>
        <span className="warung-level-pill">
          {rent.sealed ? "Disegel" : `Nunggak ${rent.owedDays} hari`}
        </span>
      </div>
      <ol className="warung-chat-thread" aria-live="polite">
        {[...opening, ...thread].map((l, i) => (
          <li key={i} data-from={l.from}>
            {l.text}
          </li>
        ))}
      </ol>
      <div className="warung-chat-replies">
        <button type="button" className="warung-cta" disabled={busy} onClick={() => void pay()}>
          Bayar {rupiah(rent.owed)}
        </button>
        {rent.canBargain && (
          <button
            type="button"
            className="warung-secondary"
            disabled={busy}
            onClick={() => void bargain()}
          >
            Minta keringanan
          </button>
        )}
        {!rent.sealed && (
          <button
            type="button"
            className="warung-secondary"
            disabled={busy}
            onClick={() =>
              say(
                { from: "me", text: "Nanti ya Ko, nunggu laku dulu." },
                {
                  from: "koko",
                  text:
                    left <= 1
                      ? "Besok saya ke sini lagi sama anak-anak, ya."
                      : "Oke, jangan lama-lama.",
                },
              )
            }
          >
            Nanti ya Ko
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
      {story.locked ? (
        <p className="warung-hint" role="status">
          {story.lockedMessage}
        </p>
      ) : (
        <p className="warung-quote">
          <b>{story.npc}:</b> “{story.intro}”
        </p>
      )}
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
        disabled={busy || !!story.locked || !story.done}
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
