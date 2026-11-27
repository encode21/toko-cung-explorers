import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { startGuideAction } from "@/game/story/guide-action";
import { useHud } from "@/state/hud-store";
import { NpcDialogueShell } from "@/ui/dialogue/NpcDialogueShell";
import { npcAppearance } from "@/ui/dialogue/npc-appearance";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { BeginnerGuideCarousel } from "./BeginnerGuideCarousel";
import { GUIDE_TOPICS, markTopicSeen, readSeenTopics, type GuideTopic } from "./guide/topics";
import "./beginner-guide.css";

export function BeginnerGuidePanel() {
  const [seen, setSeen] = useState(readSeenTopics);
  const [lesson, setLesson] = useState<GuideTopic | null>(null);
  const [line, setLine] = useState(0);
  const openLesson = (topic: GuideTopic) => {
    setLine(0);
    setLesson(topic);
    markTopicSeen(topic.id);
    setSeen((ids) => (ids.includes(topic.id) ? ids : [...ids, topic.id]));
  };
  const step = lesson?.steps[line];
  return (
    <>
      <GameModal
        title="Selesaikan Panduan Pemula!"
        className="beginner-guide-book"
        bodyClassName="beginner-guide-body"
        onClose={() => useHud.getState().setSheet(null)}
        onCloseAutoFocus={(event) => {
          event.preventDefault();
          requestAnimationFrame(() => {
            const panels = document.querySelectorAll<HTMLElement>("[data-game-panel]");
            (
              panels[panels.length - 1]?.querySelector<HTMLElement>("[data-game-close]") ??
              document.querySelector<HTMLElement>('[data-side-action="beginner-guide"]')
            )?.focus();
          });
        }}
      >
        <div className="beginner-guide-rings" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((ring) => (
            <i key={ring} />
          ))}
        </div>
        <p className="beginner-guide-intro">
          Pilih topik yang ingin dipelajari. Bisa dibaca kapan saja.
        </p>
        <BeginnerGuideCarousel count={GUIDE_TOPICS.length}>
          {GUIDE_TOPICS.map((topic) => (
            <article
              key={topic.id}
              className="beginner-guide-card"
              data-selected={lesson?.id === topic.id}
            >
              <img
                className="beginner-guide-scene"
                src={`/assets/beginner-guide/${topic.id}.webp`}
                alt=""
                draggable={false}
              />
              <button
                type="button"
                className="beginner-guide-cover"
                onClick={() => openLesson(topic)}
                aria-label={`Baca panduan ${topic.title}`}
              >
                <span className="beginner-guide-card-title">{topic.title}</span>
                {!seen.includes(topic.id) && <span className="beginner-guide-new">Baru</span>}
              </button>
              <div className="beginner-guide-card-content">
                <p className="beginner-guide-goal">{topic.summary}</p>
                <button
                  type="button"
                  className="beginner-guide-primary"
                  onClick={() => openLesson(topic)}
                >
                  Lihat panduan <ChevronRight size={16} aria-hidden />
                </button>
              </div>
            </article>
          ))}
        </BeginnerGuideCarousel>
      </GameModal>
      {lesson && step && (
        <NpcDialogueShell
          name="Koko Cung"
          role={lesson.title}
          avatar={npcAppearance("npc-koko-cung", "npc_daily_cung")}
          onClose={() => setLesson(null)}
          footer={
            <div className="beginner-guide-dialogue-actions">
              <span>
                Langkah {line + 1} dari {lesson.steps.length}
              </span>
              {line > 0 && (
                <button
                  type="button"
                  className="npc-dialogue-secondary"
                  onClick={() => setLine(line - 1)}
                >
                  <ChevronLeft size={16} aria-hidden /> Kembali
                </button>
              )}
              {step.action && (
                <button
                  type="button"
                  className="npc-dialogue-secondary"
                  onClick={() => {
                    setLesson(null);
                    startGuideAction({ label: "Tunjukkan", help: step.text, ...step.action });
                  }}
                >
                  Tunjukkan
                </button>
              )}
              <button
                type="button"
                className="npc-dialogue-next"
                onClick={() =>
                  line < lesson.steps.length - 1 ? setLine(line + 1) : setLesson(null)
                }
              >
                {line < lesson.steps.length - 1 ? "Lanjut" : "Mengerti"}{" "}
                <ChevronRight size={16} aria-hidden />
              </button>
            </div>
          }
        >
          <p className="npc-dialogue-line" aria-live="polite">
            {step.text}
          </p>
        </NpcDialogueShell>
      )}
    </>
  );
}
