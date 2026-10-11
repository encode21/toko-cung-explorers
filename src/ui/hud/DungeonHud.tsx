import { PrincipalBoard } from "./PrincipalBoard";
import { useHud } from "@/state/hud-store";
import { useEffect, useState } from "react";
import { useDungeon, dungeonCommand } from "@/game/dungeon/store";
import { useGame } from "@/state/game-store";
import { useChannels } from "@/net/channel-store";
export function DungeonHud() {
  const { data, busy, error, entranceOpen, transition, tracked } = useDungeon();
  const pos = useGame((s) => s.playerPos);
  const playing = useChannels((s) => s.playing);
  const [confirm, setConfirm] = useState(false);
  const c = data?.config,
    i = data?.instance;
  const near = (p: number[], radius = 2.5) =>
    Math.hypot(pos[0] - p[0]!, pos[2] - p[2]!) <= radius && Math.abs(pos[1] - 0.83 - p[1]!) < 1.8;
  const entrance = c && near(c.entrance, 4);
  useEffect(() => {
    setConfirm(false);
  }, [i?.id]);
  const index = c?.objectives.findIndex((o, n) => (i?.progress[n] ?? 0) < o.required) ?? -1;
  const objective = c?.objectives[index];
  const realm = i?.realm ?? "DUNGEON";
  const needsTravel = !!i && !!objective && (objective.realm ?? "DUNGEON") !== realm;
  const travelNear = c && near(realm === "WORLD" ? c.entrance : (c.worldExit ?? c.spawn), 4);
  let target: string | undefined;
  if (i?.status === "ACTIVE" && objective) {
    if (!needsTravel && objective.positions) {
      const n = objective.positions.findIndex((p, n) => near(p) && !i.found.includes(`clue-${n}`));
      if (n >= 0) target = `clue-${n}`;
    } else if (!needsTravel && near(objective.position, objective.radius))
      target = objective.target;
    if (
      realm === "DUNGEON" &&
      !i.easterEgg &&
      c?.easterEggs[0] &&
      near(c.easterEggs[0].position, 2)
    )
      target = c.easterEggs[0].id;
  }
  const button =
    "min-h-11 rounded-lg bg-amber-200 px-3 text-sm font-semibold text-slate-950 disabled:opacity-50";
  if (transition)
    return (
      <div
        className="absolute inset-0 z-[70] grid place-items-center bg-slate-950/95 text-amber-100 animate-in fade-in duration-200 motion-reduce:animate-none"
        role="status"
      >
        Menyambungkan area perjalanan…
      </div>
    );
  // Jangan tampilkan panel hanya karena error polling — hanya saat relevan ke hub/instance.
  if (!c || (!i && !entrance && !tracked)) return null;
  return (
    <>
      <PrincipalBoard />
      <section
        data-ui-panel
        data-hud-control
        aria-label="Principal Dungeon"
        className={`pointer-events-auto absolute z-30 rounded-xl border-l-2 border-amber-200 bg-slate-950/90 p-3 text-xs text-white ${i ? "left-3 top-[max(1rem,env(safe-area-inset-top))] w-[min(17rem,calc(100vw-6rem))]" : "bottom-[max(12rem,calc(env(safe-area-inset-bottom)+11rem))] left-3 w-[min(19rem,calc(100vw-2rem))]"}`}
      >
        <p className="text-[10px] tracking-widest text-amber-200">PRINCIPAL DUNGEON</p>
        <strong className="mt-1 block">
          {i ? (c.questTitle ?? "Kiriman yang Hilang") : "Principal Quest Hub"}
        </strong>
        {i ? (
          <>
            <p className="mt-2" aria-live="polite">
              {c.objectives.filter((o, n) => (i.progress[n] ?? 0) >= o.required).length} /{" "}
              {c.objectives.length} objectives
            </p>
            {i.status === "COMPLETED" ? (
              <p className="my-3 text-emerald-200">
                Dungeon selesai · +
                {data.game?.history.find((r) => r.quest_id === c.questId)?.xp_awarded ?? 400} XP · +
                {data.game?.history.find((r) => r.quest_id === c.questId)?.point_awarded ?? 0} Point
              </p>
            ) : (
              <>
                <p className="my-2">
                  {objective?.label}{" "}
                  {objective && `(${i.progress[index] ?? 0}/${objective.required})`}
                </p>
                {objective?.hint && !target && !needsTravel && (
                  <p className="text-slate-300">{objective.hint}</p>
                )}
                {needsTravel && (
                  <p className="my-2 text-amber-100">
                    {realm === "WORLD"
                      ? "Kembali ke pintu Principal di tenggara World."
                      : "Menuju loading bay untuk melanjutkan misi di World."}
                  </p>
                )}
                {needsTravel && travelNear && (
                  <button
                    className={`${button} mt-2 w-full`}
                    disabled={busy || !playing}
                    onClick={() => void dungeonCommand("travel")}
                  >
                    {realm === "WORLD" ? "Kembali ke Principal" : "Lanjut ke World"}
                  </button>
                )}
                {i.carrying && <p className="text-amber-200">▣ Barang misi dibawa</p>}
                {target && (
                  <button
                    disabled={busy || !playing}
                    className={`${button} mt-2 w-full`}
                    onClick={() => void dungeonCommand("interact", target)}
                  >
                    {target === c.easterEggs[0]?.id
                      ? "Periksa benda berkilau"
                      : objective?.type === "FIND"
                        ? "Periksa clue"
                        : objective?.label}
                  </button>
                )}
              </>
            )}
            {i.easterEgg && (
              <p className="mt-2 text-amber-200">✦ Rahasia ditemukan · bonus 100 XP saat selesai</p>
            )}
            {confirm ? (
              <div role="group" aria-label="Konfirmasi keluar" className="mt-3">
                <p>Keluar sekarang? Tidak ada reward penyelesaian.</p>
                <button
                  className={button}
                  disabled={busy}
                  onClick={() => void dungeonCommand("exit")}
                >
                  Ya, keluar
                </button>{" "}
                <button className="min-h-11 px-2" onClick={() => setConfirm(false)}>
                  Lanjut
                </button>
              </div>
            ) : (
              <button
                className="mt-2 min-h-11 underline"
                disabled={busy}
                onClick={() =>
                  i.status === "COMPLETED" ? void dungeonCommand("exit") : setConfirm(true)
                }
              >
                {i.status === "COMPLETED" ? "Kembali ke World" : "Keluar Dungeon"}
              </button>
            )}
          </>
        ) : (
          <>
            <p className="my-2">
              Level {c.requiredLevel}+ · {c.reward.xp} XP
              {(c.reward.point ?? 0) > 0
                ? ` · Hingga ${c.reward.point.toLocaleString("id-ID")} P`
                : " · Point mengikuti misi"}
            </p>
            {(c.version ?? 1) >= 2 && entrance ? (
              <button
                className={button}
                disabled={busy}
                onClick={() => {
                  useDungeon.setState({ error: "" });
                  useHud.setState({ principalPanel: "missions" });
                  // Soft refresh — jangan gagalkan UI board jika poll bentrok.
                  void dungeonCommand("read");
                }}
              >
                Mission Board
              </button>
            ) : entrance && !entranceOpen ? (
              <button
                className={button}
                onClick={() => {
                  useDungeon.setState({ entranceOpen: true, error: "" });
                  void dungeonCommand("read");
                }}
              >
                Lihat dungeon
              </button>
            ) : entrance ? (
              <>
                <p className="mb-2">
                  {data.status === "LOCKED"
                    ? `Naik ke Level ${c.requiredLevel} untuk membuka dungeon ini.`
                    : data.status === "COMPLETED_TODAY"
                      ? "Sudah selesai hari ini. Kembali besok WIB."
                      : data.status === "MAINTENANCE"
                        ? "Dungeon dalam pemeliharaan."
                        : data.status === "CAMPAIGN_ENDED"
                          ? "Campaign telah berakhir."
                          : "Jelajahi, temukan clue, dan kirim peti yang hilang."}
                </p>
                <button
                  className={button}
                  disabled={busy || data.status !== "AVAILABLE"}
                  onClick={() => void dungeonCommand("enter")}
                >
                  Masuk
                </button>
              </>
            ) : (
              <p className="mt-2">
                Menuju Principal ·{" "}
                {Math.round(Math.hypot(pos[0] - c.entrance[0], pos[2] - c.entrance[2]))} m ·
                Tenggara kota
              </p>
            )}
          </>
        )}
        {i && (c.version ?? 1) >= 2 && (
          <button
            className="min-h-11 px-2 text-amber-200"
            onClick={() => useHud.setState({ principalPanel: "leaderboard" })}
          >
            Peringkat
          </button>
        )}
        {error && !data?.quests?.length && !data?.game && (
          <p role="alert" className="mt-2 text-red-200">
            {error}
          </p>
        )}
      </section>
    </>
  );
}
