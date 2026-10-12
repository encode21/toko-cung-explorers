import { useNet } from "@/net/net-store";
import { useEffect, useState } from "react";
import { useClub, clubCommand, clubNow } from "@/game/club/store";
import { CLUB_TRACKS, DANCES, playbackPosition } from "@/game/club/model";
import { ClubRuntime } from "@/game/club/ClubRuntime";
import { connectionId } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useWorldEditor } from "@/game/editor/store";
const button =
  "min-h-11 rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-sm hover:bg-white/20 disabled:opacity-40";
const title = (id: string | null) =>
  CLUB_TRACKS.find((t) => t.id === id)?.title ?? "Belum ada lagu";
export function ClubHud() {
  const s = useClub();
  const connected = useNet((n) => n.connected);
  const pos = useGame((g) => g.playerPos);
  const overlay = useGame((g) => g.overlay);
  const sheet = useHud((h) => h.sheet);
  const editing = useWorldEditor((e) => e.mode !== "PLAYER");
  const targets = useWorldEditor((e) => e.targets);
  const [track, setTrack] = useState(CLUB_TRACKS[0]!.id);
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
  const myDance = s.data?.members[connectionId]?.dance;
  const open = sheet === "club" || sheet === "dance";
  const act = (action: string, data?: Record<string, unknown>) => void clubCommand(action, data);
  return (
    <>
      <ClubRuntime />
      {!editing && overlay === "none" && (
        <>
          {!s.inside && near("CLUB_ENTRANCE") && (
            <div className="pointer-events-auto absolute bottom-40 left-1/2 -translate-x-1/2 rounded-2xl bg-slate-950/95 p-3 text-white">
              <button className={button} disabled={s.busy} onClick={() => act("enter")}>
                🎧 Masuk Cung Underground
              </button>
              {s.error && (
                <p role="alert" className="max-w-xs text-sm text-rose-300">
                  {s.error}
                </p>
              )}
            </div>
          )}
          {s.inside && !open && (
            <div className="pointer-events-auto absolute bottom-40 left-1/2 flex max-w-[95vw] -translate-x-1/2 gap-2 rounded-2xl bg-slate-950/95 p-2 text-white">
              <button className={button} onClick={() => useHud.getState().setSheet("dance")}>
                ✦ Dance
              </button>
              <button className={button} onClick={() => useHud.getState().setSheet("club")}>
                {dj && booth ? "🎧 DJ Console" : "♫ Now Playing"}
              </button>
              {near("CLUB_ENTRANCE", true) && (
                <button className={button} disabled={s.busy} onClick={() => act("exit")}>
                  Keluar ↑
                </button>
              )}
            </div>
          )}
          {s.inside && !open && s.error && (
            <p
              role="alert"
              className="absolute bottom-56 left-1/2 max-w-[90vw] -translate-x-1/2 rounded-xl bg-slate-950/95 p-3 text-sm text-rose-300"
            >
              {s.error}
            </p>
          )}
          {s.inside && open && (
            <section
              data-ui-panel
              data-world-sheet
              role="dialog"
              aria-label={sheet === "dance" ? "Dance wheel" : "Cung Underground console"}
              className="pointer-events-auto absolute right-3 bottom-24 z-40 max-h-[72dvh] w-[min(440px,calc(100vw-24px))] overflow-y-auto rounded-3xl border border-fuchsia-300/25 bg-[#1c182b]/95 p-5 text-white shadow-2xl backdrop-blur-lg"
            >
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs tracking-widest text-fuchsia-300">CUNG UNDERGROUND</p>
                  <h2 className="text-xl font-semibold">
                    {sheet === "dance"
                      ? "Find your rhythm"
                      : dj && booth
                        ? "DJ Console"
                        : "Now Playing"}
                  </h2>
                </div>
                <button
                  className={button}
                  aria-label="Close club panel"
                  onClick={() => useHud.getState().setSheet(null)}
                >
                  ✕
                </button>
              </div>
              {s.error && (
                <p role="alert" className="my-2 text-sm text-rose-300">
                  {s.error}
                </p>
              )}
              {sheet === "dance" ? (
                <>
                  <div
                    className="relative mx-auto my-4 h-72 w-72"
                    role="group"
                    aria-label="Eight dances"
                  >
                    {DANCES.map((id, i) => {
                      const angle = (i / 8) * Math.PI * 2 - Math.PI / 2;
                      return (
                        <button
                          key={id}
                          disabled={s.busy}
                          className={`${button} absolute h-14 w-16 px-1 text-xs capitalize ${myDance?.id === id && !s.suppressed ? "!bg-fuchsia-700" : ""}`}
                          style={{
                            left: 112 + Math.cos(angle) * 102,
                            top: 116 + Math.sin(angle) * 102,
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
                      className={`${button} absolute left-28 top-[120px] w-16 px-1 text-xs`}
                      onClick={() => act("stop-dance")}
                    >
                      Stop ■
                    </button>
                  </div>
                  <p className="text-sm text-white/60">
                    Bergerak untuk berhenti. Sync mengikuti tempo dan grup penari yang dipilih.
                  </p>
                  <div className="mt-3 grid gap-2">
                    {Object.entries(s.data?.members ?? {})
                      .filter(([id, m]) => id !== connectionId && m.dance)
                      .map(([id, m]) => (
                        <button
                          key={id}
                          className={button}
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
                </>
              ) : (
                <>
                  <div className="my-4 rounded-2xl bg-black/25 p-4">
                    <p className="text-xl">{title(s.data?.mediaId ?? null)}</p>
                    <p className="mt-1 text-sm text-white/60">
                      {s.data?.playbackStatus ?? "stopped"} · {Math.floor(seconds / 60)}:
                      {String(seconds % 60).padStart(2, "0")} ·{" "}
                      {s.data?.provider === "youtube" ? "YouTube" : "Catalog"}
                    </p>
                  </div>
                  <p className="text-sm">
                    DJ: {s.data?.members[s.data.activeDjId ?? ""]?.name ?? "Booth tersedia"} ·{" "}
                    {s.data?.waiting.length ?? 0} menunggu
                  </p>
                  <p className="mt-1 text-xs text-white/60">
                    {!connected
                      ? "Reconnecting · DJ lease not renewed"
                      : dj
                        ? "DJ session active · lease renewed every 3 seconds"
                        : s.data?.waiting.includes(connectionId)
                          ? "DJ session waiting"
                          : "Club visitor session"}
                  </p>
                  {!dj && booth && (
                    <button
                      className={`${button} my-3 w-full`}
                      disabled={s.busy || s.data?.waiting.includes(connectionId)}
                      onClick={() => act("apply")}
                    >
                      {s.data?.waiting.includes(connectionId)
                        ? "Dalam antrean DJ"
                        : "Apply DJ · Join waiting queue"}
                    </button>
                  )}
                  {!dj && !booth && (
                    <p className="my-2 text-xs text-white/60">
                      Kunjungi booth untuk melamar pekerjaan DJ.
                    </p>
                  )}
                  {(dj || s.data?.waiting.includes(connectionId)) && (
                    <button
                      className={`${button} my-2`}
                      disabled={s.busy}
                      onClick={() => act("leave-dj")}
                    >
                      Leave DJ session
                    </button>
                  )}
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
                      className={button}
                      disabled={s.busy}
                      onClick={() => act("request", { mediaId: track })}
                    >
                      Request
                    </button>
                  </div>
                  <p className="text-xs text-white/60">
                    Maks. 2 permintaan tertunda · jeda 15 detik · disetujui DJ.
                  </p>
                  {dj && booth && (
                    <>
                      <div className="my-4 flex gap-2">
                        {["play", "pause", "next"].map((a) => (
                          <button
                            key={a}
                            className={`${button} flex-1 capitalize`}
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
                          <span className="flex-1 text-sm">{title(r.mediaId)}</span>
                          <button
                            aria-label={`Accept ${title(r.mediaId)}`}
                            className={button}
                            disabled={s.busy}
                            onClick={() => act("accept", { id: r.id })}
                          >
                            ✓
                          </button>
                          <button
                            aria-label={`Reject ${title(r.mediaId)}`}
                            className={button}
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
                              className={`${button} my-1 w-full`}
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
                  <h3 className="mt-4 font-semibold">Song queue</h3>
                  {s.data?.queue.map((r, i) => (
                    <div className="my-2 flex items-center gap-2" key={r.id}>
                      <span className="flex-1 text-sm">
                        {i + 1}. {title(r.mediaId)}
                      </span>
                      {dj &&
                        booth &&
                        [-1, 1].map((dir) => (
                          <button
                            key={dir}
                            aria-label={`Move ${title(r.mediaId)} ${dir < 0 ? "up" : "down"}`}
                            className={button}
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
                    <p className="text-sm text-white/50">
                      Antrean kosong. Request lagu untuk memulai.
                    </p>
                  )}
                  <p className="mt-4 text-xs text-white/50">
                    House music YouTube otomatis jalan saat masuk. Browser sering memblokir suara —
                    ketuk tombol di player kiri bawah sekali. DJ: Request → Accept → Next untuk ganti
                    lagu. Jangan unduh/rip MP3 dari YouTube.
                  </p>
                </>
              )}
            </section>
          )}
        </>
      )}
    </>
  );
}
