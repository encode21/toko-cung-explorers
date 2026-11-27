import { useEffect, useState } from "react";
import { Check, ChevronLeft, ChevronRight, LockKeyhole, RefreshCw, Star } from "lucide-react";
import { useAccount } from "@/auth/useSession";
import { retryStory, storyCommand, useStory } from "@/game/story/store";
import { canReadStoryPage, storyPageState } from "@/game/story/page-state";
import type { StorySection, StorySnapshot } from "@/game/story/types";
import { resolveGuideAction, startGuideAction } from "@/game/story/guide-action";
import { PrologNotes } from "@/game/prolog/PrologUI";
import { useHud } from "@/state/hud-store";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { FinaleCard } from "./FinaleCard";
import "./story-book.css";
import "./kulakan-book.css";

const LABELS: Record<string, string> = { jalanan: "Ojol", dagang: "Warung" };

export function KulakanBook() {
  const { data, busy, error, retry } = useStory();
  const account = useAccount((s) => s.user);
  const [selected, setSelected] = useState<string | null>(null);
  useEffect(() => {
    void storyCommand("state");
  }, []);
  const refresh = () => (retry ? retryStory() : void storyCommand("state"));
  const active = data?.enabled
    ? (data.sections.find((s) => s.id === (selected ?? data.activeSection)) ?? data.sections[0])
    : null;
  return (
    <GameModal
      title="Buku Kulakan Mbah"
      className="kulakan-book"
      bodyClassName="kulakan-book-body"
      onClose={() => useHud.getState().setSheet(null)}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        requestAnimationFrame(() => {
          const panels = document.querySelectorAll<HTMLElement>("[data-game-panel]");
          (
            panels[panels.length - 1]?.querySelector<HTMLElement>("[data-game-close]") ??
            document.querySelector<HTMLElement>('[data-side-action="kulakan-book"]')
          )?.focus();
        });
      }}
      headerAccessory={
        <button type="button" onClick={refresh} disabled={busy} aria-label="Periksa tujuan">
          <RefreshCw size={18} aria-hidden />
        </button>
      }
    >
      {error && (
        <p className="kulakan-notice" role="alert">
          {error}{" "}
          <button type="button" onClick={refresh} disabled={busy}>
            Coba lagi
          </button>
        </p>
      )}
      <PrologNotes />
      {(!account || account.guest) && !(data?.enabled && data.guest) && (
        <p className="kulakan-notice">Daftar untuk melanjutkan Buku Mbah.</p>
      )}
      {!account ? null : !data ? (
        <p className="kulakan-notice" role="status">
          {error ? "Buku belum berhasil dimuat." : "Membuka buku Mbah…"}
        </p>
      ) : !data.enabled ? (
        <p className="kulakan-notice">
          Buku Mbah belum dibuka. Lanjutkan perkenalan dengan Koko Cung.
        </p>
      ) : (
        <>
          {data.guest && <p className="kulakan-notice">{data.text.guest_book}</p>}
          {!data.path && data.showPathChoice !== false && (
            <fieldset className="kulakan-path" disabled={busy || !!retry}>
              <legend>{data.text.choose_path}</legend>
              <button
                type="button"
                onClick={() => void storyCommand("choose-path", { path: "dagang" })}
              >
                {data.text.warung_path}
              </button>
              <button
                type="button"
                onClick={() => void storyCommand("choose-path", { path: "jalanan" })}
              >
                {data.text.ojek_path}
              </button>
            </fieldset>
          )}
          <nav className="kulakan-chapters" aria-label="Bab Buku Mbah">
            {data.sections.map((section) => (
              <button
                type="button"
                key={section.id}
                aria-pressed={active?.id === section.id}
                onClick={() => {
                  setSelected(section.id);
                  if (!busy && !retry && data.activeSection !== section.id)
                    void storyCommand("set-active", { section: section.id });
                }}
              >
                <strong>{LABELS[section.id] ?? section.label}</strong>
                <span>
                  {Math.min(section.page, section.pageCount)}/{section.pageCount} Halaman
                </span>
              </button>
            ))}
          </nav>
          {active && (
            <BookChapter key={active.id} section={active} data={data} disabled={busy || !!retry} />
          )}
          <FinaleCard finalReady={!!data.finalReadyAt} />
        </>
      )}
    </GameModal>
  );
}

function BookChapter({
  section,
  data,
  disabled,
}: {
  section: StorySection;
  data: Extract<StorySnapshot, { enabled: true }>;
  disabled: boolean;
}) {
  const [index, setIndex] = useState(Math.min(section.page, section.pageCount - 1));
  const [direction, setDirection] = useState("forward");
  const claimed = index < section.page;
  const page = index === section.page ? section.current : section.pages?.[index];
  const state = storyPageState(data, section.current);
  const action = !claimed ? resolveGuideAction(section) : null;
  const next = canReadStoryPage(section, index + 1);
  const flip = (to: number) => {
    if (!canReadStoryPage(section, to)) return;
    setDirection(to < index ? "backward" : "forward");
    setIndex(to);
  };
  const notice = data.guest
    ? data.text.guest_book
    : state === "locked"
      ? data.text.locked
      : state === "needs_warung"
        ? data.text.needs_warung
        : state === "claim_in_warung"
          ? data.text.claim_in_warung
          : state === "unfinished"
            ? section.current?.goal
            : null;
  const artwork = ["jalanan", "dagang", "dapur", "kos"].includes(section.id)
    ? section.id
    : "dagang";
  return (
    <>
      <div className="kulakan-spread">
        <article
          className="kulakan-illustration"
          key={index}
          data-direction={direction}
          aria-label={`Halaman ${index + 1}`}
        >
          <img src={`/assets/beginner-guide/${artwork}.webp`} alt="" draggable={false} />
          <div className="kulakan-advice">
            <span>
              Catatan Mbah · {index + 1}/{section.pageCount}
            </span>
            <h3>{page?.npc ?? "Buku Mbah"}</h3>
            <blockquote>“{page?.advice ?? "Halaman ini sudah selesai."}”</blockquote>
            {claimed && (
              <strong className="kulakan-stamp">
                <Check size={16} aria-hidden /> Selesai
              </strong>
            )}
          </div>
        </article>
        <section className="kulakan-leaf" aria-label="Halaman dan tujuan">
          <h3>{LABELS[section.id] ?? section.label}</h3>
          <ol className="kulakan-pages">
            {Array.from({ length: section.pageCount }, (_, i) => (
              <li key={i}>
                <button
                  type="button"
                  disabled={!canReadStoryPage(section, i)}
                  aria-current={i === index ? "page" : undefined}
                  onClick={() => flip(i)}
                >
                  <span className="kulakan-page-number">{i + 1}</span>
                  <span>
                    <small>Halaman {i + 1}</small>
                    <strong>
                      {section.pages?.[i]?.title ??
                        (i === section.page ? section.current?.title : `Halaman ${i + 1}`)}
                    </strong>
                  </span>
                  {i < section.page ? (
                    <span className="kulakan-page-stamp">Selesai</span>
                  ) : i > section.page ? (
                    <LockKeyhole size={16} aria-label="Terkunci" />
                  ) : (
                    <span className="kulakan-active-mark">Aktif</span>
                  )}
                </button>
              </li>
            ))}
          </ol>
          <div className="kulakan-task" aria-live="polite" aria-atomic="true">
            <h4>{page?.title ?? "Halaman selesai"}</h4>
            <p>{page?.goal}</p>
            {!claimed && section.current && (
              <>
                <div className="kulakan-progress">
                  <span>
                    {Math.min(
                      section.current.progress.progress,
                      section.current.progress.target,
                    ).toLocaleString("id-ID")}{" "}
                    / {section.current.progress.target.toLocaleString("id-ID")}
                  </span>
                  <span>
                    <Star size={14} aria-hidden /> {data.pageXp} XP
                  </span>
                </div>
                {notice && notice !== page?.goal && <p className="kulakan-status">{notice}</p>}
                <div className="kulakan-actions">
                  {action && (
                    <button type="button" onClick={() => startGuideAction(action)}>
                      {action.label}
                    </button>
                  )}
                  <button
                    type="button"
                    className="kulakan-claim"
                    disabled={disabled || data.guest || state !== "ready"}
                    onClick={() =>
                      void storyCommand("claim-page", { section: section.id, page: section.page })
                    }
                  >
                    Ambil hadiah <Check size={16} aria-hidden />
                  </button>
                </div>
                {action && <small className="kulakan-action-help">{action.help}</small>}
              </>
            )}
            {claimed && <p className="kulakan-status">Sudah diklaim · bisa dibaca kembali.</p>}
          </div>
        </section>
      </div>
      <nav className="kulakan-flip" aria-label="Balik halaman">
        <button
          type="button"
          aria-label="Halaman sebelumnya"
          disabled={index === 0}
          onClick={() => flip(index - 1)}
        >
          <ChevronLeft size={18} aria-hidden /> Sebelumnya
        </button>
        <span>
          {!next && index < section.pageCount - 1
            ? `Selesaikan dan klaim halaman ini: ${section.current?.goal ?? ""}`
            : `Halaman ${index + 1} dari ${section.pageCount}`}
        </span>
        <button
          type="button"
          aria-label="Halaman berikutnya"
          disabled={!next}
          onClick={() => flip(index + 1)}
        >
          Berikutnya <ChevronRight size={18} aria-hidden />
        </button>
      </nav>
      <details className="kulakan-pinnacle">
        <summary>
          Target akhir {LABELS[section.id] ?? section.label} · {section.cosmetic.label}
          {section.completedAt ? " · Selesai" : ""}
        </summary>
        <ul>
          {section.pinnacle.map((goal, i) => (
            <li key={i}>
              <span>{goal.label ?? goal.type}</span>
              <strong>
                {goal.done ? "Selesai" : `${Math.min(goal.progress, goal.target)}/${goal.target}`}
              </strong>
            </li>
          ))}
        </ul>
      </details>
    </>
  );
}
