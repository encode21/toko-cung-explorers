import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { LogOut, Trophy, Package, ArrowRight, LoaderCircle } from "lucide-react";
import { PrincipalBoard } from "./PrincipalBoard";
import { useHud } from "@/state/hud-store";
import { useDungeon, dungeonCommand } from "@/game/dungeon/store";
import { announceDungeonComplete } from "@/game/dungeon/announce-complete";
import { DUNGEON_STAFF } from "@/game/dungeon/staff";
import { resolveDungeonDialogue } from "@/game/dungeon/dialogue";
import { useDungeonDialogue } from "@/game/dungeon/dialogue-store";
import { worldLandmarkFor } from "@/game/world/landmarks";
import { useGame } from "@/state/game-store";
import { useChannels } from "@/net/channel-store";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";
import { WorldActionAnchor } from "./WorldActionAnchor";
import { NpcQuestionIcon } from "./NpcQuestionIcon";
import { resolveObjective } from "@/game/editor/resolve";
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import { QuestTrackerCard, QuestTrackerButton, QuestTrackerGuidance } from "./QuestTrackerCard";

export function DungeonHud({ trackerHost }: { trackerHost: HTMLElement | null }) {
  const { data, busy, error, entranceOpen, transition, tracked } = useDungeon();
  const pos = useGame((s) => s.playerPos);
  const playing = useChannels((s) => s.playing);
  const panel = useHud((s) => s.principalPanel);
  const photoActive = useHud((s) => s.sheet === "camera");
  const { mobile } = useMobileHudLayout();
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const openDialogue = useDungeonDialogue((s) => s.open);
  const dialogueOpen = useDungeonDialogue((s) => !!s.script);
  const talking = useNpcConversation();
  const c = data?.config,
    i = data?.instance;
  const prevStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    setConfirm(false);
    setExpanded(false);
    prevStatus.current = undefined;
  }, [i?.id, mobile]);
  // Backup trigger: Mission Passed if store path missed the ACTIVE→COMPLETED edge.
  useEffect(() => {
    const next = i?.status;
    const prev = prevStatus.current;
    prevStatus.current = next;
    if (data && prev === "ACTIVE" && next === "COMPLETED") {
      announceDungeonComplete("ACTIVE", data);
    }
  }, [i?.status, i?.id, data]);
  if (talking || photoActive) return null;
  const near = (p: number[], r = 2.5) =>
    Math.hypot(pos[0] - p[0]!, pos[2] - p[2]!) <= r && Math.abs(pos[1] - 0.83 - p[1]!) < 1.8;
  const entrance = c && near(c.entrance, 4);
  const index = c?.objectives.findIndex((o, n) => (i?.progress[n] ?? 0) < o.required) ?? -1;
  const objective = c?.objectives[index];
  const realm = i?.realm ?? "DUNGEON";
  const needsTravel = !!i && !!objective && (objective.realm ?? "DUNGEON") !== realm;
  const travelNear = c && near(realm === "WORLD" ? c.entrance : (c.worldExit ?? c.spawn), 4);
  let target: string | undefined;
  if (i?.status === "ACTIVE" && objective && !needsTravel) {
    if (objective.positions) {
      const n = objective.positions.findIndex((p, n) => near(p) && !i.found.includes(`clue-${n}`));
      if (n >= 0) target = `clue-${n}`;
    } else {
      // Prefer canonical world landmarks — pinned instance config can be stale mid-run.
      const at = objective.targetId
        ? objective.position
        : worldLandmarkFor(objective.target, objective.position);
      if (near(at, objective.radius)) target = objective.target;
    }
  }
  if (
    i?.status === "ACTIVE" &&
    realm === "DUNGEON" &&
    !i.easterEgg &&
    c?.easterEggs[0] &&
    near(c.easterEggs[0].position, 2)
  )
    target = c.easterEggs[0].id;
  const staff =
    i && realm === "DUNGEON"
      ? DUNGEON_STAFF.find((s, n) =>
          near((c?.version ?? 1) < 2 ? (n === 0 ? [0, 0, 7] : [999, 0, 999]) : s.position, 2.5),
        )
      : undefined;
  const isEgg = !!target && target === c?.easterEggs[0]?.id;
  const talk =
    !!target && !isEgg && (objective?.type === "TALK" || ((c?.version ?? 1) < 2 && index === 0));
  const travel = needsTravel && travelNear;
  const actionLabel = travel
    ? realm === "WORLD"
      ? "Kembali ke Principal"
      : "Lanjut ke World"
    : isEgg
      ? "Periksa benda berkilau"
      : talk
        ? "Ajak bicara"
        : target
          ? resolveDungeonDialogue(target)?.kind === "discover"
            ? "Periksa & baca"
            : objective?.type === "FIND"
              ? "Periksa clue"
              : objective?.label
          : "Ajak bicara";
  const discoverTitle = target ? resolveDungeonDialogue(target) : null;
  const title = travel
    ? "Perjalanan distribusi"
    : talk
      ? realm === "WORLD"
        ? "Bima · Supplier"
        : "Rama · Koordinator"
      : target
        ? isEgg
          ? "Benda tak biasa"
          : discoverTitle?.kind === "discover"
            ? `${discoverTitle.name}`
            : objective?.label
        : staff
          ? `${staff.name} · ${staff.role}`
          : "";
  if (transition)
    return (
      <div
        className="absolute inset-0 z-[70] grid place-items-center bg-world-panel/95 text-world-panel-foreground"
        role="status"
      >
        <span className="flex items-center gap-3">
          <LoaderCircle className="size-5 animate-spin" />
          Menyambungkan area perjalanan…
        </span>
      </div>
    );
  if (!c || (!i && !entrance && !tracked)) return null;
  const done = c.objectives.filter((o, n) => (i?.progress[n] ?? 0) >= o.required).length;
  const reward = data.game?.history.find((r) => r.quest_id === c.questId);
  return (
    <>
      <PrincipalBoard />
      {trackerHost &&
        createPortal(
          <QuestTrackerCard
            aria-label="Principal Dungeon"
            data-dungeon-tracker
            data-instance={!!i}
            label="Principal Dungeon"
            title={i ? (c.questTitle ?? "Kiriman yang Hilang") : "Principal Quest Hub"}
            summary={
              i
                ? i.status === "COMPLETED"
                  ? "Misi selesai"
                  : objective?.label
                : entrance
                  ? `Level ${c.requiredLevel}+ · Pilih perjalananmu di Principal.`
                  : `Menuju Principal · ${Math.round(Math.hypot(pos[0] - c.entrance[0], pos[2] - c.entrance[2]))} m`
            }
            count={
              i
                ? `${index >= 0 ? index + 1 : c.objectives.length} / ${c.objectives.length}`
                : `Lv. ${c.requiredLevel}+`
            }
            expanded={expanded}
            onToggle={() => setExpanded((v) => !v)}
            toggleLabel={expanded ? "Ciutkan detail dungeon" : "Buka detail dungeon"}
            progress={
              i
                ? {
                    value: done,
                    max: c.objectives.length,
                    label: "Progres dungeon",
                    valueText: `${done} dari ${c.objectives.length} tujuan selesai`,
                  }
                : undefined
            }
            error={error}
            errorRole="alert"
            footer={
              i ? (
                (expanded || confirm || i.status === "COMPLETED") &&
                (confirm ? (
                  <div
                    role="group"
                    aria-label="Konfirmasi keluar"
                    className="quest-tracker-confirm"
                  >
                    <p>Keluar sekarang? Progres misi aktif dibatalkan tanpa reward penyelesaian.</p>
                    <div className="quest-tracker-actions">
                      <QuestTrackerButton
                        variant="danger"
                        disabled={busy}
                        onClick={() => void dungeonCommand("exit")}
                      >
                        Ya, keluar
                      </QuestTrackerButton>
                      <QuestTrackerButton variant="secondary" onClick={() => setConfirm(false)}>
                        Lanjut
                      </QuestTrackerButton>
                    </div>
                  </div>
                ) : (
                  <div className="quest-tracker-actions">
                    <QuestTrackerButton
                      variant={i.status === "COMPLETED" ? "primary" : "secondary"}
                      disabled={busy}
                      onClick={() =>
                        i.status === "COMPLETED" ? void dungeonCommand("exit") : setConfirm(true)
                      }
                    >
                      <LogOut aria-hidden className="size-3.5" />
                      {i.status === "COMPLETED" ? "Kembali ke World" : "Keluar Dungeon"}
                    </QuestTrackerButton>
                    {(c.version ?? 1) >= 2 && (
                      <QuestTrackerButton
                        variant="secondary"
                        onClick={() => useHud.setState({ principalPanel: "leaderboard" })}
                      >
                        <Trophy aria-hidden className="size-3.5" />
                        Peringkat
                      </QuestTrackerButton>
                    )}
                  </div>
                ))
              ) : entrance ? (
                <QuestTrackerButton
                  disabled={
                    busy || ((c.version ?? 1) < 2 && entranceOpen && data.status !== "AVAILABLE")
                  }
                  onClick={() => {
                    if ((c.version ?? 1) >= 2) {
                      useHud.setState({ principalPanel: "missions" });
                      void dungeonCommand("read");
                    } else if (!entranceOpen) {
                      useDungeon.setState({ entranceOpen: true });
                      void dungeonCommand("read");
                    } else void dungeonCommand("enter");
                  }}
                >
                  {(c.version ?? 1) >= 2
                    ? "Mission Board"
                    : !entranceOpen
                      ? "Lihat dungeon"
                      : data.status === "AVAILABLE"
                        ? "Masuk"
                        : (data.message ?? `Requires Level ${c.requiredLevel}`)}
                </QuestTrackerButton>
              ) : undefined
            }
          >
            {i ? (
              <>
                <p className="quest-tracker-current" aria-live="polite">
                  {i.status === "COMPLETED"
                    ? `Misi selesai · +${reward?.xp_awarded ?? c.reward.xp} XP`
                    : objective?.label}
                  {objective && objective.required > 1
                    ? ` (${i.progress[index] ?? 0}/${objective.required})`
                    : ""}
                </p>
                {needsTravel && (
                  <QuestTrackerGuidance>
                    {realm === "WORLD"
                      ? "Kembali ke pintu Principal di tenggara World."
                      : "Lanjutkan perjalanan melalui loading bay."}
                  </QuestTrackerGuidance>
                )}
                {i.status !== "COMPLETED" && objective?.hint && (
                  <p className="quest-tracker-hint">
                    {objective.target === "supplier-confirm"
                      ? "Pos supplier sementara (tenda hijau) di trotoar barat depan toko — Bima menghadap plaza."
                      : objective.target === "world-warehouse"
                        ? "Serahkan di pintu penerimaan gudang belakang Toko Cung (utara dalam denah = belakang bangunan)."
                        : objective.hint}
                  </p>
                )}
                {i.carrying && <p className="quest-tracker-current">Barang misi dibawa</p>}
                {i.easterEgg && (
                  <p className="quest-tracker-hint">
                    ✦ Rahasia ditemukan · bonus {c.easterEggs[0]?.xp ?? 100} XP saat selesai
                  </p>
                )}
                {(reward?.point_awarded ?? 0) > 0 && i.status === "COMPLETED" && (
                  <p>+{reward?.point_awarded} Point</p>
                )}
              </>
            ) : (
              <>
                <p className="quest-tracker-current">
                  Level {c.requiredLevel}+ · Pilih perjalananmu di Principal.
                </p>
                {!entrance && (
                  <QuestTrackerGuidance>
                    Menuju Principal ·{" "}
                    {Math.round(Math.hypot(pos[0] - c.entrance[0], pos[2] - c.entrance[2]))} m ·
                    Tenggara kota
                  </QuestTrackerGuidance>
                )}
              </>
            )}
          </QuestTrackerCard>,
          trackerHost,
        )}
      {i?.status === "ACTIVE" &&
        (target || travel || staff) &&
        !confirm &&
        !panel &&
        !dialogueOpen && (
          <WorldActionAnchor
            position={() => {
              const point = travel
                ? realm === "WORLD"
                  ? c.entrance
                  : (c.worldExit ?? c.spawn)
                : isEgg
                  ? c.easterEggs[0]?.position
                  : target && objective
                    ? objective.positions && target.startsWith("clue-")
                      ? objective.positions[Number(target.slice(5))]
                      : objective.targetId
                        ? resolveObjective(objective).position
                        : worldLandmarkFor(objective.target, objective.position)
                    : staff
                      ? (c.version ?? 1) < 2
                        ? [0, 0, 7]
                        : staff.position
                      : null;
              return point
                ? [point[0]!, point[1]! + (talk || (!target && staff) ? 2.25 : 1.6), point[2]!]
                : null;
            }}
          >
            <div data-hud-control data-dungeon-action>
              <button
                type="button"
                disabled={busy || !playing}
                className="world-action-button"
                aria-label={`${actionLabel} · ${title}`}
                title={`${actionLabel} · ${title}`}
                onClick={() => {
                  if (travel) {
                    void dungeonCommand("travel");
                    return;
                  }
                  // Talk, find, interact, visit, collect, etc. — open narrative beat first.
                  const script = resolveDungeonDialogue(target, !target ? staff?.id : null);
                  if (script) {
                    openDialogue(script);
                    return;
                  }
                  if (target) {
                    void dungeonCommand("interact", target);
                    return;
                  }
                }}
              >
                {busy ? (
                  <LoaderCircle className="animate-spin" aria-hidden />
                ) : travel ? (
                  <ArrowRight aria-hidden />
                ) : talk || !target ? (
                  <NpcQuestionIcon />
                ) : (
                  <Package aria-hidden />
                )}
              </button>
            </div>
          </WorldActionAnchor>
        )}
    </>
  );
}
