import { NPC_AVATARS } from "@/identity/characters";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { useHud } from "@/state/hud-store";
import { useGame } from "@/state/game-store";
import { NpcDialogueShell } from "@/ui/dialogue/NpcDialogueShell";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { QuestTrackerButton } from "@/ui/hud/QuestTrackerCard";
import { useHome } from "@/game/home/store";
import { prologRoute, showPrologGuidance } from "../guidance";
import { PrologTaskPanel } from "../PrologTaskPanel";
import { retryProlog, prologCommand, useProlog } from "../store";
import { NEIGHBOR_AVATAR, advance, endPrologSleep, needsHome, usePulang } from "./steps";
import "@/ui/hud/delivery-details.css";
import "@/ui/quests/quest-complete.css";
import "./pulang.css";

function PulangError() {
  const { error, retry, busy, data } = useProlog();
  if (!error) return null;
  return (
    <p role="alert">
      {error}{" "}
      <button
        type="button"
        disabled={busy}
        onClick={() => (retry ? retryProlog() : void prologCommand("state"))}
      >
        {data?.text["retry"]}
      </button>
    </p>
  );
}
function money(n: number) {
  return `Kas ${n.toLocaleString("id-ID")}`;
}

/** F5 "Pulang" overlays: Rumah steps, neighbors, Koko and the end-of-day summary. */
export function PrologHomeUI() {
  const { data: d, busy, retry, presenting, phoneOpened } = useProlog();
  const p = usePulang();
  const sheet = useHud((s) => s.sheet);
  const open = useHud((s) => s.prologOpen);
  const inside = useHome((s) => s.inside);
  const windowOpen = useHome((s) => s.windowOpen);
  const guidanceMuted = useGame((s) => s.guidanceMuted);
  if (!d) return null;
  const t = d.text,
    disabled = busy || !!retry;

  if (p.talk) {
    const who = p.talk;
    return (
      <NpcDialogueShell
        name={t[who]!}
        role={t[`${who}_role`]}
        avatar={NPC_AVATARS[NEIGHBOR_AVATAR[who]] ?? DEFAULT_AVATAR}
        onClose={() => usePulang.setState({ talk: null, talked: [...new Set([...p.talked, who])] })}
        footer={
          <div className="quest-tracker">
            <QuestTrackerButton
              onClick={() =>
                usePulang.setState({ talk: null, talked: [...new Set([...p.talked, who])] })
              }
            >
              {t["continue"]}
            </QuestTrackerButton>
          </div>
        }
      >
        <p>{t[`${who}_line`]}</p>
      </NpcDialogueShell>
    );
  }
  if (d.step === "box" && p.box)
    return (
      <GameModal
        title={t["box_title"]!}
        className="delivery-details-modal pulang-box-modal"
        bodyClassName="pulang-box-body"
        onClose={() => usePulang.setState({ box: false })}
        footer={
          <button
            type="button"
            className="delivery-details-confirm"
            disabled={disabled}
            onClick={async () => {
              await advance("box");
              usePulang.setState({ box: false });
              useHud.getState().setSheet("beginner-guide");
            }}
          >
            Buka Panduan Pemula
          </button>
        }
      >
        <p className="pulang-box-intro">{t["box_found"]}</p>
        <figure className="pulang-photo">
          <img
            src="/assets/intro/trust.jpg"
            alt="Teras Warung Mbah"
            width={1280}
            height={720}
            decoding="async"
          />
          <figcaption>
            {t["photo"]}
            <small>{t["photo_caption"]}</small>
          </figcaption>
        </figure>
        <blockquote className="pulang-box-page">{t["book_page"]}</blockquote>
        <PulangError />
      </GameModal>
    );
  if (d.step === "koko" && p.koko)
    return (
      <NpcDialogueShell
        name={t["koko"]!}
        role={t["role"]}
        avatar={NPC_AVATARS["npc_daily_cung"] ?? DEFAULT_AVATAR}
        onClose={() => usePulang.setState({ koko: false })}
        busy={busy}
        footer={
          <div className="quest-tracker">
            <QuestTrackerButton
              disabled={disabled}
              onClick={async () => {
                await advance("koko");
                usePulang.setState({ koko: false });
              }}
            >
              {t["continue"]}
            </QuestTrackerButton>
          </div>
        }
      >
        <p>{t["welcome"]}</p>
        <p>{t["koko_explain"]}</p>
        <p className="pulang-stamp">✓ {t["stamp_koko"]}</p>
        <PulangError />
      </NpcDialogueShell>
    );
  if (d.step === "sleep" && p.sleeping) {
    const s = d.summary;
    return (
      <GameModal
        title={t["summary"]!}
        className="quest-complete-modal pulang-summary-modal"
        bodyClassName="quest-complete-body"
        onClose={() => {
          if (!busy) endPrologSleep();
        }}
        footer={
          <button
            type="button"
            className="quest-complete-confirm"
            disabled={disabled}
            onClick={() => void advance("sleep")}
          >
            Selesaikan Prolog
          </button>
        }
      >
        {s && (
          <dl className="pulang-summary">
            <dt>{t[`summary_cash_${s.cashLabel}`]}</dt>
            <dd>{money(s.cash)}</dd>
            <dt>{t["summary_stamps"]}</dt>
            <dd>{s.stamps.map((id) => t[`stamp_${id}`] ?? id).join(" · ")}</dd>
            <dt>{t["summary_title"]}</dt>
            <dd>{s.title}</dd>
          </dl>
        )}
        <p className="pulang-summary-note">{t["next_page"]}</p>
        <PulangError />
      </GameModal>
    );
  }
  if (sheet) return null;
  if (d.step === "wake")
    return (
      <>
        {presenting && <div className="pulang-wake" aria-hidden />}
        <PrologTaskPanel
          title={t["place"]!}
          open={open}
          footer={
            <QuestTrackerButton disabled={disabled} onClick={() => void advance("wake")}>
              {t["continue"]}
            </QuestTrackerButton>
          }
        >
          <p>{t["camera_hint"]}</p>
          <PulangError />
        </PrologTaskPanel>
      </>
    );
  if (d.step === "phone")
    return (
      <PrologTaskPanel
        title={t["phone"]!}
        open={open}
        footer={
          phoneOpened ? (
            <QuestTrackerButton disabled={disabled} onClick={() => void advance("phone")}>
              {t["continue"]}
            </QuestTrackerButton>
          ) : (
            <QuestTrackerButton onClick={() => useProlog.setState({ phoneOpened: true })}>
              Buka Chat
            </QuestTrackerButton>
          )
        }
      >
        {phoneOpened && (
          <p className="pulang-chat">
            <b>{t["phone_from"]}</b>
            {t["phone_message"]}
          </p>
        )}
        <PulangError />
      </PrologTaskPanel>
    );

  const tasks: Record<string, [string, string]> = {
    window: [t["window"]!, t["window_hint"]!],
    box: [t["box"]!, windowOpen ? t["window_open"]! : ""],
    gang: inside
      ? [t["gang"]!, ""]
      : [
          p.talked.length < 2 ? `${t["talk"]}: ${t["romlah"]} · ${t["kosim"]}` : t["mouth"]!,
          p.talked.length < 2 ? t["etalase"]! : t["mouth_hint"]!,
        ],
    koko: [t["koko_goal"]!, t["near_koko"]!],
    return: [t["return"]!, t["return_hint"]!],
    sleep: [t["sleep"]!, t["sleep_hint"]!],
  };
  const task = tasks[d.step];
  if (!task) return null;
  const [title, hint] = needsHome(d.step)
    ? [`${t["enter_home"]}: ${task[0]}`, t["return_hint"]!]
    : task;
  const showGuide = open && guidanceMuted && !!prologRoute();
  return (
    <PrologTaskPanel
      title={title}
      open={open}
      footer={
        showGuide && (
          <QuestTrackerButton onClick={showPrologGuidance}>{t["guide"]}</QuestTrackerButton>
        )
      }
    >
      {hint && <p>{hint}</p>}
      <PulangError />
    </PrologTaskPanel>
  );
}
