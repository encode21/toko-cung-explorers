import { useEffect, useState } from "react";
import { useWarung } from "@/game/warung/store";
import { useGame } from "@/state/game-store";
import { useGameUi } from "@/state/game-ui-store";
import { useHud } from "@/state/hud-store";
import { useChannels } from "@/net/channel-store";
import { NPC_AVATARS } from "@/identity/characters";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { NpcDialogueShell } from "@/ui/dialogue/NpcDialogueShell";
import { GameModal, useGamePanelLock } from "@/ui/game-ui/GamePanel";
import { QuestTrackerButton } from "@/ui/hud/QuestTrackerCard";
import { CityMap } from "@/ui/minimap/CityMap";
import { startPrologCamera, stopPrologCamera } from "./camera";
import { goToPrologWarung, nearPrologKoko, prologRoute, showPrologGuidance } from "./guidance";
import { PrologTaskPanel } from "./PrologTaskPanel";
import { prologCommand, retryProlog, useProlog } from "./store";
import { PrologHomeUI } from "./pulang/PrologHomeUI";
import { isHomeStep } from "./pulang/steps";
import "./prolog.css";

function PrologError({ onRetry }: { onRetry?: (() => void) | undefined }) {
  const { data, error, retry, busy } = useProlog();
  if (!error) return null;
  return (
    <p role="alert">
      {error}{" "}
      <button
        type="button"
        disabled={busy}
        onClick={() => {
          if (retry) retryProlog();
          else if (onRetry) onRetry();
          else void prologCommand("state");
        }}
      >
        {data?.text["retry"] ?? "Coba lagi"}
      </button>
    </p>
  );
}
function Reveal() {
  useGamePanelLock();
  const d = useProlog((s) => s.data);
  const [progress, setProgress] = useState(0);
  const duration = (d?.reveal.seconds ?? 0) * 1000;
  useEffect(() => {
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const stopForReducedMotion = () => {
      if (motion.matches) stopPrologCamera();
    };
    if (!motion.matches) startPrologCamera();
    motion.addEventListener("change", stopForReducedMotion);
    const start = performance.now();
    const timer = window.setInterval(() => {
      const p = duration > 0 ? Math.min(1, (performance.now() - start) / duration) : 1;
      setProgress(p);
      const { busy, retry } = useProlog.getState();
      if (p < 1 || busy || retry) return;
      window.clearInterval(timer);
      void prologCommand("advance", { step: "reveal" });
    }, 100);
    return () => {
      window.clearInterval(timer);
      motion.removeEventListener("change", stopForReducedMotion);
      stopPrologCamera();
    };
  }, [duration]);
  if (!d) return null;
  return (
    <div
      className="prolog-reveal quest-tracker"
      data-ui-panel
      data-hud-control
      role="region"
      aria-label={d.text["map"]}
    >
      <p>{d.text["reveal"]}</p>
      <ol aria-live="polite">
        {d.reveal.labels
          .slice(
            0,
            Math.min(d.reveal.labels.length, 1 + Math.floor(progress * d.reveal.labels.length)),
          )
          .map((label) => (
            <li key={label}>{label}</li>
          ))}
      </ol>
      <PrologError
        onRetry={
          progress === 1 ? () => void prologCommand("advance", { step: "reveal" }) : undefined
        }
      />
    </div>
  );
}

export function PrologUI() {
  const { data: d, busy, retry, presenting } = useProlog();
  const serving = useWarung((s) => !!s.inside && s.serviceView);
  const traveling = useGameUi((s) => s.traveling);
  const playing = useChannels((s) => s.playing);
  const sheet = useHud((s) => s.sheet);
  const open = useHud((s) => s.prologOpen);
  const nearKoko = useGame(() => d?.step === "meet" && open && nearPrologKoko());
  const guidanceMuted = useGame((s) => s.guidanceMuted);
  if (!d || d.completedAt || !playing) return null;
  if (isHomeStep(d)) return <PrologHomeUI />;
  const t = d.text,
    disabled = busy || !!retry;
  if (sheet) return null;
  const showPresentation = open || presenting;
  const close = () => {
    useProlog.setState({ presenting: false });
    useHud.getState().setPrologOpen(false);
  };
  if (d.step === "reveal" && showPresentation) return <Reveal />;
  if (d.step === "map" && showPresentation)
    return (
      <GameModal
        title={t["map"]!}
        className="prolog-map-sheet"
        onClose={close}
        wide
        footer={
          <div className="quest-tracker">
            <QuestTrackerButton
              disabled={disabled}
              onClick={() => void prologCommand("advance", { step: "map" })}
            >
              {t["continue"]}
            </QuestTrackerButton>
          </div>
        }
      >
        <div className="prolog-map">
          <strong className="prolog-stamp">✓ {t["stamp"]}</strong>
          <CityMap />
        </div>
        <PrologError />
      </GameModal>
    );
  if (d.step === "path" && showPresentation)
    return (
      <NpcDialogueShell
        name={t["koko"]!}
        role={t["role"]}
        avatar={NPC_AVATARS["npc_daily_cung"] ?? DEFAULT_AVATAR}
        onClose={close}
        busy={busy}
        footer={
          <div className="quest-tracker prolog-actions">
            <QuestTrackerButton
              disabled={disabled}
              onClick={() => void prologCommand("choose-path", { path: "dagang" })}
            >
              {t["dagang"]?.replace("{cash}", d.startCash.toLocaleString("id-ID"))}
            </QuestTrackerButton>
            <QuestTrackerButton
              variant="secondary"
              disabled={disabled}
              onClick={() => void prologCommand("choose-path", { path: "jalanan" })}
            >
              {t["jalanan"]}
            </QuestTrackerButton>
          </div>
        }
      >
        <p>{t["path"]}</p>
        <PrologError />
      </NpcDialogueShell>
    );
  if (serving && !d.goal.done) return null;
  let titleKey = "title";
  if (d.step === "goal") titleKey = d.goal.kind;
  else if (d.step === "meet") titleKey = "meet";
  else if (d.step === "map" || d.step === "reveal") titleKey = "map";
  else if (d.step === "path") titleKey = "koko";
  const title = t[titleKey]!;
  const showLegacyGoalControls = d.version === 1;
  const showGuide = open && guidanceMuted && !!prologRoute();
  const hasActions =
    d.step === "goal" ||
    (d.step === "meet" && (showGuide || nearKoko)) ||
    d.step === "book" ||
    d.step === "finish";
  return (
    <PrologTaskPanel
      title={title}
      open={open}
      footer={
        hasActions && (
          <>
            {d.step === "meet" ? (
              <>
                {showGuide && (
                  <QuestTrackerButton
                    variant={nearKoko ? "secondary" : "primary"}
                    onClick={showPrologGuidance}
                  >
                    {t["guide"]}
                  </QuestTrackerButton>
                )}
                {nearKoko && (
                  <QuestTrackerButton
                    disabled={disabled}
                    onClick={() => void prologCommand("advance", { step: "meet" })}
                  >
                    {t["talk"]}
                  </QuestTrackerButton>
                )}
              </>
            ) : d.step === "goal" ? (
              <>
                {d.goal.done ? (
                  <QuestTrackerButton
                    disabled={disabled}
                    onClick={() => void prologCommand("advance", { step: "goal" })}
                  >
                    Lanjut ke panduan
                  </QuestTrackerButton>
                ) : (
                  <>
                    {showGuide && (
                      <QuestTrackerButton onClick={showPrologGuidance}>
                        {t["guide"]}
                      </QuestTrackerButton>
                    )}
                    <QuestTrackerButton
                      variant={showGuide ? "secondary" : "primary"}
                      disabled={traveling}
                      onClick={() => {
                        if (d.goal.kind === "serve") void goToPrologWarung();
                        else useHud.getState().setSheet(d.path === "jalanan" ? "ojek" : "warung");
                      }}
                    >
                      {t[d.goal.kind]}
                    </QuestTrackerButton>
                    {showLegacyGoalControls && (
                      <QuestTrackerButton
                        variant="secondary"
                        disabled={disabled}
                        onClick={() => void prologCommand("state")}
                      >
                        {t["refresh"]}
                      </QuestTrackerButton>
                    )}
                  </>
                )}
              </>
            ) : (
              (d.step === "book" || d.step === "finish") && (
                <QuestTrackerButton onClick={() => useHud.getState().setSheet("beginner-guide")}>
                  {t["continue"]}
                </QuestTrackerButton>
              )
            )}
          </>
        )
      }
    >
      {d.step === "goal" && (
        <>
          {t[`${d.goal.kind}_help`] && <p>{t[`${d.goal.kind}_help`]}</p>}
          {showLegacyGoalControls && (
            <progress
              className="quest-tracker-progress"
              aria-label={title}
              value={d.goal.progress}
              max={Math.max(1, d.goal.target)}
            />
          )}
        </>
      )}
      <PrologError />
    </PrologTaskPanel>
  );
}

export function PrologNotes() {
  const { data: d, busy, retry } = useProlog();
  if (!d || !["book", "finish"].includes(d.step)) return null;
  const t = d.text;
  return (
    <section className="prolog-notes quest-tracker" aria-label={t["title"]}>
      <h3>{t["title"]}</h3>
      <blockquote>{d.step === "book" ? t["welcome"] : t["finish"]}</blockquote>
      <QuestTrackerButton
        disabled={busy || !!retry}
        onClick={() => void prologCommand("advance", { step: d.step })}
      >
        {d.step === "finish" ? "Lanjut ke panduan" : t["continue"]}
      </QuestTrackerButton>
      <PrologError />
    </section>
  );
}
