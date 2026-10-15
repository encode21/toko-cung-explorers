import { GamePanel, GameTabs } from "@/ui/game-ui/GamePanel";
import { useNet } from "@/net/net-store";
import { useEffect, useState } from "react";
import { useClub, clubCommand, clubNow } from "@/game/club/store";
import {
  CLUB_TRACKS,
  DANCES,
  parseYoutubeId,
  playbackPosition,
  trackTitle,
} from "@/game/club/model";
import { ClubRuntime } from "@/game/club/ClubRuntime";
import { useClubYoutubeUi } from "@/game/club/youtube-host";
import { connectionId } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useWorldEditor } from "@/game/editor/store";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";
import { DanceControls } from "./DanceControls";

const button =
  "min-h-11 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-40";
const buttonSm =
  "min-h-11 shrink-0 rounded-lg border border-white/15 bg-white/10 px-2.5 py-1.5 text-xs hover:bg-white/20 disabled:opacity-40";

export function ClubHud() {
  const s = useClub();
  const connected = useNet((n) => n.connected);
  const pos = useGame((g) => g.playerPos);
  const overlay = useGame((g) => g.overlay);
  const sheet = useHud((h) => h.sheet);
  const editing = useWorldEditor((e) => e.mode !== "PLAYER");
  const targets = useWorldEditor((e) => e.targets);
  const { mobile } = useMobileHudLayout();
  const [track, setTrack] = useState<string>(CLUB_TRACKS[0]!.id);
  const [consoleTab, setConsoleTab] = useState<"music" | "queue" | "dj">("music");
  const [ytUrl, setYtUrl] = useState("");
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const t = setInterval(
      () => setSeconds(s.data ? Math.floor(playbackPosition(s.data, clubNow())) : 0),
      500,
    );
    return () => clearInterval(t);
  }, [s.data]);
  useEffect(() => {
    if (!s.inside && (sheet === "club" || sheet === "dance")) useHud.getState().setSheet(null);
  }, [s.inside, sheet]);
  const near = (type: string, exit = false) => {
    const t = targets.find(
      (t) =>
        t.active &&
        t.type === type &&
        (type !== "CLUB_ENTRANCE" || t.tags.includes("club-exit") === exit),
    );
    return (
      !!t &&
      Math.hypot(pos[0] - t.position.x, pos[1] - 0.83 - t.position.y, pos[2] - t.position.z) <
        t.radius + 1
    );
  };
  const dj = !!s.data && s.data.activeDjId === connectionId;
  const booth = near("DJ_BOOTH");
  const ytStatus = useClubYoutubeUi((u) => u.status);
  const ytResume = useClubYoutubeUi((u) => u.resume);
  const myDance = s.data?.members[connectionId]?.dance;
  const open = sheet === "club" || sheet === "dance";
  const act = (action: string, data?: Record<string, unknown>) => void clubCommand(action, data);
  const btn = mobile ? buttonSm : button;

  return (
    <>
      <ClubRuntime />
      {!editing && overlay === "none" && s.inside && !open && <DanceControls />}
      {!editing && overlay === "none" && (
        <>
          {!open && s.error && (
            <p
              role="alert"
              className="absolute bottom-56 left-1/2 max-w-[90vw] -translate-x-1/2 rounded-xl bg-slate-950/95 p-3 text-sm text-rose-300"
            >
              {s.error}
            </p>
          )}
          {s.inside && open && (
            <GamePanel
              title={sheet === "dance" ? "Dance wheel" : "Cung Underground console"}
              onClose={() => useHud.getState().setSheet(null)}
              wide={sheet !== "dance"}
              className={sheet === "dance" ? "game-dance-panel" : ""}
            >
              {s.error && (
                <p role="alert" className="my-2 text-sm text-rose-300">
                  {s.error}
                </p>
              )}
              {sheet === "dance" ? (
                <div className="game-dance-layout">
                  <div
                    className={`relative mx-auto my-3 ${mobile ? "h-56 w-56" : "my-4 h-72 w-72"}`}
                    role="group"
                    aria-label="Eight dances"
                  >
                    {DANCES.map((id, i) => {
                      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                      const r = 78;
                      const origin = 84;
                      return (
                        <button
                          key={id}
                          disabled={s.busy}
                          className={`${btn} absolute h-12 w-14 px-1 text-[10px] capitalize ${myDance?.id === id && !s.suppressed ? "!bg-fuchsia-700" : ""}`}
                          style={{
                            left: origin + Math.cos(angle) * r,
                            top: origin + Math.sin(angle) * r,
                          }}
                          onClick={() => {
                            act("dance", { danceId: id });
                            useHud.getState().setSheet(null);
                          }}
                        >
                          {id}
                        </button>
                      );
                    })}
                    <button
                      className={`${btn} absolute left-[5.5rem] top-[5.5rem] w-14 px-1 text-[10px]`}
                      onClick={() => act("stop-dance")}
                    >
                      Stop
                    </button>
                  </div>
                  <div>
                    <p className="text-xs text-white/60 sm:text-sm">
                      Bergerak untuk berhenti. Sync mengikuti tempo penari lain.
                    </p>
                    <div className="mt-3 grid gap-2">
                      {Object.entries(s.data?.members ?? {})
                        .filter(([id, m]) => id !== connectionId && m.dance)
                        .map(([id, m]) => (
                          <button
                            key={id}
                            className={btn}
                            disabled={s.busy}
                            onClick={() => {
                              act("sync", { target: id });
                              useHud.getState().setSheet(null);
                            }}
                          >
                            Sync · {m.name} · {m.dance?.id}
                          </button>
                        ))}
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <GameTabs
                    value={consoleTab}
                    onChange={setConsoleTab}
                    tabs={[
                      { id: "music", label: "Musik & request" },
                      { id: "queue", label: "Antrean" },
                      ...(dj && booth ? [{ id: "dj" as const, label: "DJ Console" }] : []),
                    ]}
                  />
                  {consoleTab === "music" && (
                    <>
                      {(ytStatus === "autoplay-blocked" ||
                        ytStatus === "failed" ||
                        ytStatus === "unavailable") && (
                        <div className="my-2 rounded-lg bg-amber-200/10 p-2">
                          <p>
                            {ytStatus === "failed" || ytStatus === "unavailable"
                              ? "Video tidak dapat diputar. DJ dapat memilih lagu lain."
                              : "Ketuk untuk mengaktifkan suara video."}
                          </p>
                          <button className={btn} onClick={() => ytResume?.()}>
                            Aktifkan playback
                          </button>
                        </div>
                      )}
                      <div className="my-3 rounded-2xl bg-black/25 p-3">
                        <p className="text-base font-medium sm:text-xl">
                          {trackTitle(s.data?.mediaId ?? null)}
                        </p>
                        <p className="mt-1 text-xs text-white/60 sm:text-sm">
                          {s.data?.playbackStatus ?? "stopped"} · {Math.floor(seconds / 60)}:
                          {String(seconds % 60).padStart(2, "0")} ·{" "}
                          {s.data?.provider === "youtube" ? "YouTube" : "Catalog"}
                        </p>
                        {mobile && (
                          <p className="mt-2 text-[11px] text-white/45">
                            Video di dinding NOW PLAYING. Pause/ganti lagu hanya lewat DJ Console di
                            booth.
                          </p>
                        )}
                      </div>
                      <p className="text-sm">
                        DJ: {s.data?.members[s.data.activeDjId ?? ""]?.name ?? "Booth tersedia"} ·{" "}
                        {s.data?.waiting.length ?? 0} menunggu
                      </p>
                      <p className="mt-1 text-xs text-white/60">
                        {!connected
                          ? "Reconnecting…"
                          : dj
                            ? "DJ session aktif"
                            : s.data?.waiting.includes(connectionId)
                              ? "Antrean DJ"
                              : "Pengunjung"}
                      </p>
                      {!dj && booth && (
                        <button
                          className={`${btn} my-3 w-full`}
                          disabled={s.busy || s.data?.waiting.includes(connectionId)}
                          onClick={() => act("apply")}
                        >
                          {s.data?.waiting.includes(connectionId) ? "Dalam antrean DJ" : "Apply DJ"}
                        </button>
                      )}
                      {!dj && !booth && (
                        <p className="my-2 text-xs text-white/60">Dekati booth untuk Apply DJ.</p>
                      )}
                      {(dj || s.data?.waiting.includes(connectionId)) && (
                        <button
                          className={`${btn} my-2`}
                          disabled={s.busy}
                          onClick={() => act("leave-dj")}
                        >
                          Leave DJ
                        </button>
                      )}
                      {
                        <>
                          <div className="my-3 flex gap-2">
                            <select
                              aria-label="Choose song request"
                              className="min-w-0 flex-1 rounded-xl bg-slate-800 p-2"
                              value={track}
                              onChange={(e) => setTrack(e.target.value)}
                            >
                              {CLUB_TRACKS.map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.title}
                                  {t.youtubeId ? " · YT" : ""}
                                </option>
                              ))}
                            </select>
                            <button
                              className={btn}
                              disabled={s.busy}
                              onClick={() => act("request", { mediaId: track })}
                            >
                              Request
                            </button>
                          </div>
                          <p className="text-xs text-white/60">
                            Maks. 2 permintaan · jeda 15 detik · disetujui DJ.
                          </p>
                        </>
                      }
                      {dj && !booth && (
                        <p className="my-3 text-sm text-amber-200/90">
                          Dekati DJ booth untuk DJ Console.
                        </p>
                      )}
                      {!dj && (
                        <p className="my-3 text-xs text-white/55 sm:text-sm">
                          Pause & ganti lagu hanya DJ aktif di booth.
                        </p>
                      )}
                    </>
                  )}
                  {consoleTab === "dj" && dj && booth && (
                    <>
                      <p className="mb-2 text-xs text-fuchsia-200/80">
                        Atur lagu, playback, dan pencahayaan klub.
                      </p>
                      <label className="mt-2 block text-sm">
                        Tempel link YouTube
                        <div className="mt-1 flex gap-2">
                          <input
                            aria-label="YouTube URL"
                            className="min-w-0 flex-1 rounded-xl bg-slate-800 p-2 text-sm"
                            placeholder="https://youtu.be/…"
                            value={ytUrl}
                            onChange={(e) => setYtUrl(e.target.value)}
                          />
                          <button
                            className={btn}
                            disabled={s.busy || !parseYoutubeId(ytUrl)}
                            onClick={() => {
                              act("set-url", { url: ytUrl.trim() });
                              setYtUrl("");
                            }}
                          >
                            Putar
                          </button>
                        </div>
                      </label>
                      <div className="my-3 flex gap-2">
                        {["play", "pause", "next"].map((a) => (
                          <button
                            key={a}
                            className={`${btn} flex-1 capitalize`}
                            disabled={s.busy}
                            onClick={() => act(a)}
                          >
                            {a}
                          </button>
                        ))}
                      </div>
                      <label className="text-sm">
                        Lighting{" "}
                        <select
                          className="ml-2 rounded-xl bg-slate-800 p-2"
                          value={s.data?.lighting}
                          disabled={s.busy}
                          onChange={(e) => act("lighting", { lighting: e.target.value })}
                        >
                          {["neon", "sunset", "ocean"].map((p) => (
                            <option key={p}>{p}</option>
                          ))}
                        </select>
                      </label>
                      <h3 className="mt-4 font-semibold">Incoming requests</h3>
                      {s.data?.requests.map((r) => (
                        <div className="my-2 flex items-center gap-2" key={r.id}>
                          <span className="flex-1 text-sm">{trackTitle(r.mediaId)}</span>
                          <button
                            aria-label={`Accept ${trackTitle(r.mediaId)}`}
                            className={btn}
                            disabled={s.busy}
                            onClick={() => act("accept", { id: r.id })}
                          >
                            ✓
                          </button>
                          <button
                            aria-label={`Reject ${trackTitle(r.mediaId)}`}
                            className={btn}
                            disabled={s.busy}
                            onClick={() => act("reject", { id: r.id })}
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                      {!s.data?.requests.length && (
                        <p className="text-sm text-white/50">Belum ada permintaan.</p>
                      )}
                      {!!s.data?.waiting.length && (
                        <>
                          <h3 className="mt-4 font-semibold">Transfer control</h3>
                          {s.data.waiting.map((id) => (
                            <button
                              key={id}
                              className={`${btn} my-1 w-full`}
                              disabled={s.busy}
                              onClick={() => act("transfer", { target: id })}
                            >
                              → {s.data?.members[id]?.name}
                            </button>
                          ))}
                        </>
                      )}
                    </>
                  )}
                  {consoleTab === "queue" && (
                    <>
                      <h3 className="mt-4 font-semibold">Song queue</h3>
                      {s.data?.queue.map((r, i) => (
                        <div className="my-2 flex items-center gap-2" key={r.id}>
                          <span className="flex-1 text-sm">
                            {i + 1}. {trackTitle(r.mediaId)}
                          </span>
                          {dj &&
                            booth &&
                            [-1, 1].map((dir) => (
                              <button
                                key={dir}
                                aria-label={`Move ${trackTitle(r.mediaId)} ${dir < 0 ? "up" : "down"}`}
                                className={btn}
                                disabled={s.busy || i + dir < 0 || i + dir >= s.data!.queue.length}
                                onClick={() => {
                                  const order = s.data!.queue.map((t) => t.id);
                                  [order[i], order[i + dir]] = [order[i + dir]!, order[i]!];
                                  act("reorder", { order });
                                }}
                              >
                                {dir < 0 ? "↑" : "↓"}
                              </button>
                            ))}
                        </div>
                      ))}
                      {!s.data?.queue.length && (
                        <p className="text-sm text-white/50">Antrean kosong.</p>
                      )}
                    </>
                  )}
                </>
              )}
            </GamePanel>
          )}
        </>
      )}
    </>
  );
}
