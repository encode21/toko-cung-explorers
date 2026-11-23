import { useState, type ReactNode } from "react";
import { logoutAccount } from "@/auth/useSession";
import { NPC_AVATARS } from "@/identity/characters";
import { DEFAULT_AVATAR } from "@/identity/avatar";
import { useHud } from "@/state/hud-store";
import { useGame } from "@/state/game-store";
import { NpcDialogueShell } from "@/ui/dialogue/NpcDialogueShell";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { QuestTrackerButton, QuestTrackerCard } from "@/ui/hud/QuestTrackerCard";
import { useHome } from "@/game/home/store";
import { useGang } from "@/game/gang/store";
import { nearPrologKoko } from "../guidance";
import { retryProlog, prologCommand, useProlog } from "../store";
import { NEIGHBOR_AVATAR, advance, guideHome, usePulang } from "./steps";
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
  const { data: d, busy, retry } = useProlog();
  const p = usePulang();
  const sheet = useHud((s) => s.sheet);
  const inside = useHome((s) => s.inside);
  const inGang = useGang((s) => s.inside !== null);
  useGame((s) => s.playerPos);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [register, setRegister] = useState(false);
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
      <GameModal title={t["box_title"]!} onClose={() => usePulang.setState({ box: false })}>
        <div className="pulang-box">
          <p>{t["box_found"]}</p>
          <figure className="pulang-photo" aria-label={t["photo"]}>
            <div className="pulang-photo-art" aria-hidden>
              <span>Toko Cung</span>
            </div>
            <figcaption>
              {t["photo"]}
              <small>{t["photo_caption"]}</small>
            </figcaption>
          </figure>
          <blockquote>{t["book_page"]}</blockquote>
        </div>
        <div className="quest-tracker">
          <QuestTrackerButton
            disabled={disabled}
            onClick={async () => {
              await advance("box");
              usePulang.setState({ box: false });
              useHud.getState().setSheet("notes");
            }}
          >
            {t["book"]}
          </QuestTrackerButton>
        </div>
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
      <GameModal title={t["summary"]!} onClose={() => usePulang.setState({ sleeping: false })}>
        <dl className="pulang-summary">
          {s && (
            <>
              <dt>{t[`summary_cash_${s.cashLabel}`]}</dt>
              <dd>{money(s.cash)}</dd>
              <dt>{t["summary_stamps"]}</dt>
              <dd>{s.stamps.map((id) => t[`stamp_${id}`] ?? id).join(" · ")}</dd>
              <dt>{t["summary_title"]}</dt>
              <dd>{s.title}</dd>
            </>
          )}
        </dl>
        <p>{t["next_page"]}</p>
        {d.guest && (
          <div className="pulang-guest">
            <p>{t["guest"]}</p>
            <QuestTrackerButton
              disabled={busy}
              onClick={() => {
                if (!register) return setRegister(true);
                void logoutAccount().then(() => window.location.assign("/auth"));
              }}
            >
              {register ? t["guest"] : t["register"]}
            </QuestTrackerButton>
          </div>
        )}
        <div className="quest-tracker">
          <QuestTrackerButton disabled={disabled} onClick={() => void advance("sleep")}>
            {t["good_night"]}
          </QuestTrackerButton>
        </div>
        <PulangError />
      </GameModal>
    );
  }
  if (sheet) return null;

  if (d.step === "wake")
    return (
      <>
        <div className="pulang-wake" aria-hidden />
        <div className="prolog-tracker">
          <QuestTrackerCard
            label={t["title"]!}
            title={t["place"]!}
            expanded
            onToggle={() => {}}
            footer={
              <QuestTrackerButton disabled={disabled} onClick={() => void advance("wake")}>
                {t["continue"]}
              </QuestTrackerButton>
            }
          >
            <p>{t["camera_hint"]}</p>
            <PulangError />
          </QuestTrackerCard>
        </div>
      </>
    );
  if (d.step === "phone")
    return (
      <div className="pulang-phone" role="dialog" aria-label={t["phone"]}>
        <strong>📱 {t["phone"]}</strong>
        {phoneOpen ? (
          <>
            <p className="pulang-chat">
              <b>{t["phone_from"]}</b>
              {t["phone_message"]}
            </p>
            <QuestTrackerButton disabled={disabled} onClick={() => void advance("phone")}>
              {t["continue"]}
            </QuestTrackerButton>
          </>
        ) : (
          <QuestTrackerButton onClick={() => setPhoneOpen(true)}>
            {t["phone_open"]}
          </QuestTrackerButton>
        )}
        <PulangError />
      </div>
    );

  const tracker: Record<string, [string, string, ReactNode?]> = {
    window: [t["window"]!, t["window_hint"]!],
    box: [t["box"]!, useHome.getState().windowOpen ? t["window_open"]! : ""],
    gang: inside
      ? [t["gang"]!, ""]
      : [
          p.talked.length < 2 ? `${t["talk"]}: ${t["romlah"]} · ${t["kosim"]}` : t["mouth"]!,
          p.talked.length < 2 ? t["etalase"]! : t["mouth_hint"]!,
          inGang && p.talked.length >= 2 && (
            <QuestTrackerButton onClick={() => useGame.getState().setWaypoint("prolog-home-mouth")}>
              {t["guide"]}
            </QuestTrackerButton>
          ),
        ],
    koko: [
      t["koko_goal"]!,
      t["near_koko"]!,
      <>
        <QuestTrackerButton onClick={() => useGame.getState().setWaypoint("prolog-koko")}>
          {t["guide"]}
        </QuestTrackerButton>
        {nearPrologKoko() && (
          <QuestTrackerButton onClick={() => usePulang.setState({ koko: true })}>
            {t["talk"]}
          </QuestTrackerButton>
        )}
      </>,
    ],
    return: [
      t["return"]!,
      t["return_hint"]!,
      <QuestTrackerButton onClick={guideHome}>{t["guide"]}</QuestTrackerButton>,
    ],
    sleep: [t["sleep"]!, t["sleep_hint"]!],
  };
  const row = tracker[d.step];
  if (!row) return null;
  return (
    <>
      <div className="prolog-tracker">
        <QuestTrackerCard
          label={t["title"]!}
          title={row[0]}
          expanded
          onToggle={() => {}}
          footer={row[2]}
        >
          {row[1] && <p>{row[1]}</p>}
          <PulangError />
        </QuestTrackerCard>
      </div>
    </>
  );
}
