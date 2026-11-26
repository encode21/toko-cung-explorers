import { useEffect, useState } from "react";
import { ArrowRight, Check, ChevronLeft, ChevronRight, RefreshCw, Star } from "lucide-react";
import { useAccount } from "@/auth/useSession";
import { retryStory, storyCommand, useStory } from "@/game/story/store";
import { storyPageState } from "@/game/story/page-state";
import type { StorySection } from "@/game/story/types";
import { resolveGuideAction, startGuideAction } from "@/game/story/guide-action";
import { PrologNotes } from "@/game/prolog/PrologUI";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { useHud } from "@/state/hud-store";
import { NpcDialogueShell } from "@/ui/dialogue/NpcDialogueShell";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { BeginnerGuideArtwork } from "./BeginnerGuideArtwork";
import { BeginnerGuideCarousel } from "./BeginnerGuideCarousel";
import { FinaleCard } from "./FinaleCard";
import "./story-book.css";
import "./beginner-guide.css";

const LABELS: Readonly<Record<string, string>> = {
  jalanan: "Jalanan",
  dagang: "Dagang",
  dapur: "Dapur",
  kos: "Kos-kosan",
};

/** The book keeps server-owned progress; opening a lesson never claims or starts navigation. */
export function BeginnerGuidePanel() {
  const { data, busy, error, retry } = useStory();
  const account = useAccount((s) => s.user);
  const [lesson, setLesson] = useState<StorySection | null>(null);
  const [line, setLine] = useState(0);
  useEffect(() => {
    void storyCommand("state");
  }, []);
  const close = () => useHud.getState().setSheet(null);
  const refresh = () => (retry ? retryStory() : void storyCommand("state"));
  const active = data?.enabled ? data.sections.find((s) => s.id === data.activeSection) : null;
  const action = lesson ? resolveGuideAction(lesson) : null;
  const staleLesson =
    !!lesson &&
    (!data?.enabled || !data.sections.some((s) => s.id === lesson.id && s.page === lesson.page));
  const openLesson = (section: StorySection) => {
    setLine(0);
    setLesson(section);
    if (data?.enabled && data.activeSection !== section.id && !busy && !retry)
      void storyCommand("set-active", { section: section.id });
  };
  return (
    <>
      <GameModal
        title="Selesaikan Panduan Pemula!"
        className="beginner-guide-book"
        bodyClassName="beginner-guide-body"
        onClose={close}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => {
            const panels = document.querySelectorAll<HTMLElement>("[data-game-panel]");
            const next = panels[panels.length - 1];
            (
              next?.querySelector<HTMLElement>("[data-game-close]") ??
              document.querySelector<HTMLElement>('[data-side-action="beginner-guide"]')
            )?.focus();
          });
        }}
        headerAccessory={
          <button
            type="button"
            className="beginner-guide-refresh"
            onClick={refresh}
            disabled={busy}
            aria-label="Periksa progres panduan"
          >
            <RefreshCw size={16} aria-hidden />
          </button>
        }
      >
        <div className="beginner-guide-rings" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((ring) => (
            <i key={ring} />
          ))}
        </div>
        <PrologNotes />
        {error && (
          <p className="beginner-guide-notice" role="alert">
            {error}{" "}
            <button type="button" onClick={refresh} disabled={busy}>
              Coba lagi
            </button>
          </p>
        )}
        {!account ? (
          <p className="beginner-guide-empty">
            Masuk ke akun untuk membaca panduan dan menyimpan progresmu.
          </p>
        ) : !data ? (
          <p className="beginner-guide-empty" role="status">
            Memuat panduan…
          </p>
        ) : !data.enabled ? (
          <p className="beginner-guide-empty">
            Panduan belum tersedia. Lanjutkan perkenalan dengan Koko Cung, lalu periksa lagi.
          </p>
        ) : (
          <>
            {!data.path && data.showPathChoice !== false && (
              <fieldset className="beginner-guide-path" disabled={busy || !!retry}>
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
            <BeginnerGuideCarousel count={data.sections.length}>
              {data.sections.map((section) => {
                const label = LABELS[section.id] ?? section.label;
                const artwork = Object.hasOwn(LABELS, section.id) ? section.id : "dagang";
                const page = section.current;
                const state = storyPageState(data, page);
                const complete = !!section.completedAt;
                const selected = section.id === data.activeSection;
                return (
                  <article
                    key={section.id}
                    className="beginner-guide-card"
                    data-selected={selected}
                    data-complete={complete}
                  >
                    <img
                      className="beginner-guide-scene"
                      src={`/assets/beginner-guide/${artwork}.webp`}
                      alt=""
                      draggable={false}
                    />
                    <button
                      type="button"
                      className="beginner-guide-cover"
                      onClick={() => openLesson(section)}
                      aria-label={`Baca panduan ${label}`}
                    >
                      <span className="beginner-guide-card-title">{page?.title ?? label}</span>
                      {complete && (
                        <span className="beginner-guide-stamp">
                          <Check aria-hidden /> Selesai
                        </span>
                      )}
                    </button>
                    <div className="beginner-guide-card-content">
                      <p className="beginner-guide-goal">
                        {page?.goal ||
                          (complete
                            ? "Semua langkah sudah selesai."
                            : "Capai target akhir untuk hadiah bagian.")}
                      </p>
                      <div className="beginner-guide-meta">
                        <span className="beginner-guide-page">
                          {label} {Math.min(section.page + (page ? 1 : 0), section.pageCount)}/
                          {section.pageCount}
                        </span>
                        {page && (
                          <span className="beginner-guide-progress">
                            <progress
                              value={page.progress.progress}
                              max={Math.max(1, page.progress.target)}
                              aria-label={`Progres ${page.title}`}
                            />
                            <span>
                              {Math.min(page.progress.progress, page.progress.target)}/
                              {page.progress.target}
                            </span>
                          </span>
                        )}
                      </div>
                      <div className="beginner-guide-reward">
                        <Star aria-hidden />{" "}
                        <strong>{page ? `${data.pageXp} XP` : section.cosmetic.label}</strong>
                      </div>
                      {page && state === "ready" ? (
                        <button
                          type="button"
                          className="beginner-guide-primary"
                          disabled={busy || !!retry}
                          onClick={() =>
                            void storyCommand("claim-page", {
                              section: section.id,
                              page: section.page,
                            })
                          }
                        >
                          Ambil hadiah <Check size={16} aria-hidden />
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="beginner-guide-primary"
                          onClick={() => openLesson(section)}
                        >
                          {complete ? "Lihat hasil" : "Lihat panduan"}
                          <ChevronRight size={16} aria-hidden />
                        </button>
                      )}
                      {page && state !== "ready" && state !== "unfinished" && (
                        <small className="beginner-guide-status">
                          {state === "locked"
                            ? data.text.locked
                            : state === "guest"
                              ? "Daftar untuk melanjutkan"
                              : state === "needs_warung"
                                ? "Buka warung terlebih dahulu"
                                : "Ambil hasil bab di Warungku"}
                        </small>
                      )}
                    </div>
                  </article>
                );
              })}
            </BeginnerGuideCarousel>
            {active && (
              <details className="beginner-guide-milestone" key={active.id}>
                <summary>
                  Target akhir {LABELS[active.id] ?? active.label}{" "}
                  <span>{active.cosmetic.label}</span>
                </summary>
                <ul>
                  {active.pinnacle.map((goal, index) => (
                    <li key={index}>
                      <span>{goal.label ?? goal.type}</span>
                      <strong>
                        {goal.done ? (
                          <Check aria-label="Selesai" size={15} />
                        ) : (
                          `${Math.min(goal.progress, goal.target)}/${goal.target}`
                        )}
                      </strong>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            <FinaleCard finalReady={!!data.finalReadyAt} />
          </>
        )}
      </GameModal>
      {lesson && (
        <NpcDialogueShell
          name="Mbah"
          role={
            lesson.current
              ? `Catatan dari ${lesson.current.npc}`
              : (LABELS[lesson.id] ?? lesson.label)
          }
          avatar={DEFAULT_AVATAR}
          portrait={<BeginnerGuideArtwork kind="guide" className="beginner-guide-portrait" />}
          onClose={() => setLesson(null)}
          footer={
            <div className="beginner-guide-dialogue-actions">
              <span>{line + 1}/2</span>
              {line === 1 && (
                <button type="button" className="npc-dialogue-secondary" onClick={() => setLine(0)}>
                  <ChevronLeft size={16} aria-hidden /> Kembali
                </button>
              )}
              <button
                type="button"
                className="npc-dialogue-next"
                onClick={() => {
                  if (line === 0) {
                    setLine(1);
                    return;
                  }
                  setLesson(null);
                  if (!staleLesson && action) startGuideAction(action);
                }}
              >
                {line === 0
                  ? "Lanjut"
                  : staleLesson
                    ? "Kembali ke panduan"
                    : (action?.label ?? "Mengerti")}
                <ArrowRight size={16} aria-hidden />
              </button>
            </div>
          }
        >
          <p className="npc-dialogue-line">
            {line === 0
              ? (lesson.current?.advice ??
                (lesson.completedAt
                  ? "Bagian ini sudah selesai. Hadiah yang kamu dapat tersimpan di koleksimu."
                  : "Langkah-langkahnya sudah selesai. Sekarang selesaikan target akhir bagian ini."))
              : staleLesson
                ? "Progresmu sudah diperbarui. Buka kembali panduan untuk melihat langkah terbaru."
                : (lesson.current?.goal ?? "Lihat target akhir di bagian bawah buku panduan.")}
          </p>
          {line === 1 && action && !staleLesson && (
            <p className="beginner-guide-dialogue-help">{action.help}</p>
          )}
        </NpcDialogueShell>
      )}
    </>
  );
}
