import { useEffect, useRef, useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  LogOut,
  Trophy,
  MessageCircle,
  Package,
  ArrowRight,
  LoaderCircle,
} from "lucide-react";
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
export function DungeonHud() {
  const { data, busy, error, entranceOpen, transition, tracked } = useDungeon();
  const pos = useGame((s) => s.playerPos);
  const playing = useChannels((s) => s.playing);
  const panel = useHud((s) => s.principalPanel);
  const { mobile, touch } = useMobileHudLayout();
  const [expanded, setExpanded] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const openDialogue = useDungeonDialogue((s) => s.open);
  const dialogueOpen = useDungeonDialogue((s) => !!s.script);
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
  const button =
    "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-world-outline px-3 text-xs font-semibold text-world-panel-foreground transition hover:bg-white/10 active:scale-[.98] disabled:opacity-50";
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
      <section
        data-ui-panel
        data-hud-control
        aria-label="Principal Dungeon"
        data-dungeon-tracker
        data-instance={!!i}
        className={`pointer-events-auto absolute z-30 rounded-xl border-l-2 border-amber-200/60 hud-glass text-world-panel-foreground ${i ? "left-[max(.75rem,env(safe-area-inset-left))] top-[max(.75rem,env(safe-area-inset-top))] w-[min(18rem,calc(100vw-6.75rem))]" : "bottom-[max(12rem,calc(env(safe-area-inset-bottom)+11rem))] left-3 w-[min(19rem,calc(100vw-2rem))]"} ${mobile ? "p-2" : "p-3"}`}
      >
        <div className="flex items-start gap-2">
          <div className="min-w-0 flex-1">
            <p className="text-[9px] font-semibold uppercase tracking-widest text-amber-200">
              Principal Dungeon
            </p>
            <h2 className="mt-1 truncate text-xs font-semibold leading-snug">
              {i ? (c.questTitle ?? "Kiriman yang Hilang") : "Principal Quest Hub"}
            </h2>
            {i && !expanded && (
              <p className="mt-1 truncate text-[11px] text-world-muted">
                {i.status === "COMPLETED" ? "Misi selesai" : objective?.label}
              </p>
            )}
          </div>
          {i && (
            <button
              className="grid size-11 shrink-0 place-items-center rounded-lg hover:bg-white/10"
              aria-label={expanded ? "Ciutkan detail dungeon" : "Buka detail dungeon"}
              aria-expanded={expanded}
              onClick={() => setExpanded((v) => !v)}
            >
              {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
            </button>
          )}
        </div>
        {i ? (
          <>
            <div className={`mt-2 flex items-center gap-2 ${expanded ? "" : "hidden"}`}>
              <div
                role="progressbar"
                aria-label="Progres dungeon"
                aria-valuemin={0}
                aria-valuemax={c.objectives.length}
                aria-valuenow={done}
                className="h-1 flex-1 overflow-hidden rounded-full bg-white/10"
              >
                <div
                  className="h-full rounded-full bg-world-accent transition-all"
                  style={{ width: `${(done / c.objectives.length) * 100}%` }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-world-muted">
                {done} / {c.objectives.length}
              </span>
            </div>
            <p className={`mt-2 text-xs leading-5 ${expanded ? "" : "hidden"}`} aria-live="polite">
              {i.status === "COMPLETED"
                ? `Misi selesai · +${reward?.xp_awarded ?? c.reward.xp} XP`
                : objective?.label}
              {objective && objective.required > 1
                ? ` (${i.progress[index] ?? 0}/${objective.required})`
                : ""}
            </p>
            {needsTravel && expanded && (
              <p className="mt-1 text-[11px] leading-4 text-amber-100">
                {realm === "WORLD"
                  ? "Kembali ke pintu Principal di tenggara World."
                  : "Lanjutkan perjalanan melalui loading bay."}
              </p>
            )}
            {expanded && (
              <div className="mt-2 border-t border-world-outline pt-2 text-[11px] leading-5 text-world-muted">
                {i.status !== "COMPLETED" && objective?.hint && (
                  <p>
                    {objective.target === "supplier-confirm"
                      ? "Pos supplier sementara (tenda hijau) di trotoar barat depan toko — Bima menghadap plaza."
                      : objective.target === "world-warehouse"
                        ? "Serahkan di pintu penerimaan gudang belakang Toko Cung (utara dalam denah = belakang bangunan)."
                        : objective.hint}
                  </p>
                )}
                {i.carrying && (
                  <p className="flex items-center gap-1 text-amber-200">
                    <Package className="size-3" />
                    Barang misi dibawa
                  </p>
                )}
                {i.easterEgg && (
                  <p>✦ Rahasia ditemukan · bonus {c.easterEggs[0]?.xp ?? 100} XP saat selesai</p>
                )}
                {(reward?.point_awarded ?? 0) > 0 && i.status === "COMPLETED" && (
                  <p>+{reward?.point_awarded} Point</p>
                )}
              </div>
            )}
            {(expanded || confirm || i.status === "COMPLETED") && (
              <div className="mt-2 flex flex-wrap gap-1">
                {confirm ? (
                  <div
                    role="group"
                    aria-label="Konfirmasi keluar"
                    className="w-full rounded-lg bg-white/5 p-2"
                  >
                    <p className="mb-2 text-xs leading-5">
                      Keluar sekarang? Progres misi aktif dibatalkan tanpa reward penyelesaian.
                    </p>
                    <div className="flex gap-2">
                      <button
                        className={button}
                        disabled={busy}
                        onClick={() => void dungeonCommand("exit")}
                      >
                        Ya, keluar
                      </button>
                      <button className={button} onClick={() => setConfirm(false)}>
                        Lanjut
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      className={button}
                      disabled={busy}
                      onClick={() =>
                        i.status === "COMPLETED" ? void dungeonCommand("exit") : setConfirm(true)
                      }
                    >
                      <LogOut className="size-3.5" />
                      {i.status === "COMPLETED" ? "Kembali ke World" : "Keluar Dungeon"}
                    </button>
                    {(c.version ?? 1) >= 2 && (
                      <button
                        className={button}
                        onClick={() => useHud.setState({ principalPanel: "leaderboard" })}
                      >
                        <Trophy className="size-3.5" />
                        Peringkat
                      </button>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        ) : (
          <>
            <p className="my-2 text-xs text-world-muted">
              Level {c.requiredLevel}+ · Pilih perjalananmu di Principal.
            </p>
            {entrance ? (
              <button
                className={button}
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
              </button>
            ) : (
              <p className="text-xs">
                Menuju Principal ·{" "}
                {Math.round(Math.hypot(pos[0] - c.entrance[0], pos[2] - c.entrance[2]))} m ·
                Tenggara kota
              </p>
            )}
          </>
        )}
        {error && (
          <p role="alert" className="mt-2 text-[11px] leading-4 text-red-200">
            {error}
          </p>
        )}
      </section>
      {i?.status === "ACTIVE" &&
        (target || travel || staff) &&
        !confirm &&
        !panel &&
        !dialogueOpen && (
          <div
            data-ui-panel
            data-hud-control
            data-dungeon-action
            className={`pointer-events-auto absolute z-30 ${touch ? "right-[max(.75rem,env(safe-area-inset-right))] bottom-[calc(env(safe-area-inset-bottom)+11rem)] max-w-[min(15rem,calc(100vw-8.5rem))]" : "left-1/2 -translate-x-1/2 bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] max-w-sm"}`}
          >
            <button
              disabled={busy || !playing}
              className="flex min-h-11 w-full items-center gap-2 rounded-xl py-2 pl-2 pr-3 text-left text-world-panel-foreground hud-glass transition active:scale-[.98] disabled:opacity-60"
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
              <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-world-accent text-world-accent-foreground">
                {busy ? (
                  <LoaderCircle className="size-4 animate-spin" />
                ) : travel ? (
                  <ArrowRight className="size-4" />
                ) : talk || !target ? (
                  <MessageCircle className="size-4" />
                ) : (
                  <Package className="size-4" />
                )}
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-semibold leading-4">{title}</span>
                <span className="mt-1 block text-[11px] text-world-muted">
                  {busy ? "Memproses…" : actionLabel}
                </span>
              </span>
            </button>
          </div>
        )}
    </>
  );
}
