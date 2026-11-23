import { useEffect, useState } from "react";
import { logoutAccount } from "@/auth/useSession";
import { useWarung } from "@/game/warung/store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useChannels } from "@/net/channel-store";
import { NPC_AVATARS } from "@/identity/characters";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { NpcDialogueShell } from "@/ui/dialogue/NpcDialogueShell";
import { GameModal, useGamePanelLock } from "@/ui/game-ui/GamePanel";
import { QuestTrackerButton, QuestTrackerCard } from "@/ui/hud/QuestTrackerCard";
import { CityMap } from "@/ui/minimap/CityMap";
import { prologCameraProgress, startPrologCamera, stopPrologCamera } from "./camera";
import { guideProlog, nearPrologKoko } from "./guidance";
import { prologCommand, retryProlog, useProlog } from "./store";
import { PrologHomeUI } from "./pulang/PrologHomeUI";
import { isHomeStep } from "./pulang/steps";
import "./prolog.css";

function PrologError() {
  const { data, error, retry, busy } = useProlog();
  if (!error) return null;
  return (
    <p role="alert">
      {error}{" "}
      <button
        type="button"
        disabled={busy}
        onClick={() => (retry ? retryProlog() : void prologCommand("state"))}
      >
        {data?.text["retry"] ?? "Coba lagi"}
      </button>
    </p>
  );
}
function Reveal() {
  useGamePanelLock();
  const { data: d, busy, retry } = useProlog();
  const [progress, setProgress] = useState(0);
  useEffect(() => {
    startPrologCamera();
    let finished = false;
    const timer = window.setInterval(() => {
      const p = prologCameraProgress();
      setProgress(p);
      if (p >= 1 && !finished) {
        finished = true;
        void prologCommand("advance", { step: "reveal" });
      }
    }, 100);
    return () => {
      window.clearInterval(timer);
      stopPrologCamera();
    };
  }, []);
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
      <QuestTrackerButton
        disabled={busy || !!retry}
        onClick={() => void prologCommand("advance", { step: "reveal" })}
      >
        {d.text["skip"]}
      </QuestTrackerButton>
      <PrologError />
    </div>
  );
}

export function PrologUI() {
  const { data: d, busy, retry, presenting } = useProlog();
  const serving = useWarung((s) => !!s.inside && s.serviceView);
  const playing = useChannels((s) => s.playing);
  const sheet = useHud((s) => s.sheet);
  useGame((s) => s.playerPos);
  const [expanded, setExpanded] = useState(true);
  if (!d || d.completedAt || !playing) return null;
  if (isHomeStep(d)) return <PrologHomeUI />;
  const t = d.text,
    disabled = busy || !!retry;
  const close = () => useProlog.setState({ presenting: false });
  if (d.step === "reveal" && presenting) return <Reveal />;
  if (d.step === "map" && presenting)
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
  if (d.step === "path" && presenting)
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
  if (sheet || (serving && !d.goal.done)) return null;
  const title = d.step === "goal" ? t[d.goal.kind]! : d.step === "meet" ? t["meet"]! : t["title"]!;
  return (
    <div className="prolog-tracker">
      <QuestTrackerCard
        label={t["title"]!}
        title={title}
        expanded={serving ? false : expanded}
        onToggle={() => setExpanded(!expanded)}
        progress={
          d.step === "goal"
            ? { value: d.goal.progress, max: d.goal.target, label: title }
            : undefined
        }
        footer={
          <>
            {d.step === "meet" ? (
              <>
                <QuestTrackerButton onClick={guideProlog}>{t["guide"]}</QuestTrackerButton>
                {nearPrologKoko() && (
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
                    {t["notes"]}
                  </QuestTrackerButton>
                ) : (
                  <>
                    <QuestTrackerButton onClick={guideProlog}>{t["guide"]}</QuestTrackerButton>
                    <QuestTrackerButton
                      variant="secondary"
                      onClick={() =>
                        useHud.getState().setSheet(d.path === "jalanan" ? "ojek" : "warung")
                      }
                    >
                      {t[d.goal.kind]}
                    </QuestTrackerButton>
                    <QuestTrackerButton
                      variant="secondary"
                      disabled={disabled}
                      onClick={() => void prologCommand("state")}
                    >
                      {t["refresh"]}
                    </QuestTrackerButton>
                  </>
                )}
              </>
            ) : (
              <QuestTrackerButton
                onClick={() => {
                  useProlog.setState({ presenting: true });
                  if (d.step === "book" || d.step === "finish") useHud.getState().setSheet("notes");
                }}
              >
                {t["continue"]}
              </QuestTrackerButton>
            )}
          </>
        }
      >
        {d.step === "goal" && <p>{t[`${d.goal.kind}_help`]}</p>}
        <PrologError />
      </QuestTrackerCard>
    </div>
  );
}

export function PrologNotes() {
  const { data: d, busy, retry } = useProlog();
  const [register, setRegister] = useState(false);
  if (!d || !["book", "finish"].includes(d.step)) return null;
  const t = d.text;
  return (
    <section className="prolog-notes quest-tracker" aria-label={t["title"]}>
      <h3>{t["title"]}</h3>
      <blockquote>{d.step === "book" ? t["welcome"] : t["finish"]}</blockquote>
      {d.step === "finish" && d.guest && (
        <>
          <p>{t["guest"]}</p>
          <QuestTrackerButton
            disabled={busy}
            onClick={() => {
              if (!register) {
                setRegister(true);
                return;
              }
              void logoutAccount().then(() => window.location.assign("/auth"));
            }}
          >
            {register ? t["guest"] : t["register"]}
          </QuestTrackerButton>
        </>
      )}
      <QuestTrackerButton
        disabled={busy || !!retry}
        onClick={() => void prologCommand("advance", { step: d.step })}
      >
        {d.step === "finish" ? t["notes"] : t["continue"]}
      </QuestTrackerButton>
      <PrologError />
    </section>
  );
}
