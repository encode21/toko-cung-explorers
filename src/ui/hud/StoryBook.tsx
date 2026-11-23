import { storyPageState } from "@/game/story/page-state";
import { useProlog } from "@/game/prolog/store";
import { useEffect, useState } from "react";
import { BookOpen } from "lucide-react";
import { useAccount } from "@/auth/useSession";
import { retryStory, storyCommand, useStory } from "@/game/story/store";
import { useHud } from "@/state/hud-store";
import { QuestTrackerButton, QuestTrackerCard } from "./QuestTrackerCard";
import "./story-book.css";

export function StoryBook() {
  const [expanded, setExpanded] = useState(true);
  const { data, busy, error, retry } = useStory();
  const account = useAccount((s) => s.user);
  useEffect(() => {
    void storyCommand("state");
  }, []);
  if (!account) return null;
  if (data && !data.enabled) return null;
  const errorMessage = error && (
    <p role="alert">
      {error}{" "}
      <button
        type="button"
        onClick={() => (retry ? retryStory() : void storyCommand("state"))}
        disabled={busy}
      >
        Coba lagi
      </button>
    </p>
  );
  if (!data)
    return (
      <section className="story-book" aria-busy={busy}>
        {errorMessage || "Memuat Buku Mbah…"}
      </section>
    );
  const text = data.text;
  const section = data.sections.find((s) => s.id === data.activeSection)!;
  const page = section.current;
  const state = storyPageState(data, page);
  return (
    <section className="story-book" aria-label={text.title} aria-busy={busy}>
      <h2>
        <BookOpen aria-hidden />
        {text.title}
      </h2>
      {errorMessage}
      {!data.path && data.showPathChoice !== false && (
        <fieldset disabled={busy || !!retry}>
          <legend>{text.choose_path}</legend>
          <QuestTrackerButton onClick={() => void storyCommand("choose-path", { path: "dagang" })}>
            {text.warung_path}
          </QuestTrackerButton>
          <QuestTrackerButton
            variant="secondary"
            onClick={() => void storyCommand("choose-path", { path: "jalanan" })}
          >
            {text.ojek_path}
          </QuestTrackerButton>
        </fieldset>
      )}
      <nav aria-label={text.title} className="story-sections">
        {data.sections.map((s) => (
          <button
            key={s.id}
            type="button"
            aria-pressed={s.id === section.id}
            disabled={busy || !!retry}
            onClick={() => void storyCommand("set-active", { section: s.id })}
          >
            {s.label} {s.page}/{s.pageCount}
            {s.pinnacleReached ? " ✓" : ""}
          </button>
        ))}
      </nav>
      {page ? (
        <QuestTrackerCard
          label={section.label}
          title={page.title}
          count={`${section.page + 1}/${section.pageCount}`}
          expanded={expanded}
          onToggle={() => setExpanded(!expanded)}
          progress={{ value: page.progress.progress, max: page.progress.target, label: page.goal }}
          footer={
            <div className="story-actions">
              <QuestTrackerButton
                disabled={busy || !!retry || state !== "ready"}
                onClick={() =>
                  void storyCommand("claim-page", { section: section.id, page: section.page })
                }
              >
                {state === "locked" ? text.locked : `${text.claim} · +${data.pageXp} XP`}
              </QuestTrackerButton>
              {(page.needsWarung || page.progress.claimInWarung) && (
                <QuestTrackerButton onClick={() => useHud.getState().setSheet("warung")}>
                  {page.needsWarung ? text.needs_warung : text.open_warung}
                </QuestTrackerButton>
              )}
              <QuestTrackerButton
                variant="secondary"
                disabled={busy || !!retry}
                onClick={() => void storyCommand("state")}
              >
                {text.refresh}
              </QuestTrackerButton>
            </div>
          }
        >
          <blockquote>“{page.advice}”</blockquote>
          <p className="story-npc">{page.npc}</p>
          <p>
            {page.goal} · {Math.min(page.progress.progress, page.progress.target)}/
            {page.progress.target}
          </p>
          {state !== "ready" && (
            <p role="status" data-story-status={state}>
              {state === "locked"
                ? text.locked
                : state === "needs_warung"
                  ? text.needs_warung
                  : state === "claim_in_warung"
                    ? text.claim_in_warung
                    : state === "guest"
                      ? text.guest_book
                      : text.unfinished}
            </p>
          )}
        </QuestTrackerCard>
      ) : (
        <p role="status">{section.completedAt ? text.completed : text.waiting_pinnacle}</p>
      )}
      <details className="story-pinnacle">
        <summary>
          {text.pinnacle}
          {section.pinnacleReached ? " ✓" : ""}
        </summary>
        <ul>
          {section.pinnacle.map((g, i) => (
            <li key={i}>
              {g.done ? "✓ " : ""}
              {g.label} · {Math.min(g.progress, g.target)}/{g.target}
            </li>
          ))}
        </ul>
        <p>
          {text.reward}: {section.cosmetic.label}
        </p>
      </details>
    </section>
  );
}

export function StoryTracker() {
  const data = useStory((s) => s.data);
  const prolog = useProlog((s) => s.data);
  if (!data?.enabled || (prolog && !prolog.completedAt)) return null;
  const section = data.sections.find((s) => s.id === data.activeSection);
  if (!section || section.completedAt) return null;
  return (
    <button
      type="button"
      data-hud-control
      data-ui-panel
      className="story-hud-tip"
      aria-label={`${data.text.open}: ${section.label}`}
      onClick={() => useHud.getState().setSheet("notes")}
    >
      <BookOpen aria-hidden size={16} />
      <span>
        <strong>{data.text.title}</strong>
        <small>
          {data.locked ? data.text.locked : (section.current?.goal ?? data.text.waiting_pinnacle)}
        </small>
      </span>
    </button>
  );
}
