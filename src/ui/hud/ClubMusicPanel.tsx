import { useEffect, useRef, useState, type ReactNode } from "react";
import { CLUB_TRACKS, parseYoutubeId, playbackPosition, trackTitle } from "@/game/club/model";
import { clubCommand, clubNow, clubTarget, useClub } from "@/game/club/store";
import { toggleClubMusicMute, useClubYoutubeUi } from "@/game/club/youtube-host";
import { connectionId } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import { useGame } from "@/state/game-store";
import { GameButton, GameIconButton, GameModal, GameTabs } from "@/ui/game-ui/GamePanel";
import { ClubMusicIcon } from "./ClubMusicIcon";
import "./club-music-panel.css";

type MusicTab = "music" | "queue" | "dj";
type MusicAction =
  | "request"
  | "apply"
  | "leave-dj"
  | "set-url"
  | "play"
  | "pause"
  | "next"
  | "lighting"
  | "accept"
  | "reject"
  | "reorder"
  | "transfer";
const DJ_ACTIONS = new Set<MusicAction>([
  "set-url",
  "play",
  "pause",
  "next",
  "lighting",
  "accept",
  "reject",
  "reorder",
  "transfer",
]);

// Mock-only catalog entries have no audio; offer playable tracks to visitors.
const REQUEST_TRACKS = CLUB_TRACKS.filter((item) => item.youtubeId);

function atDjBooth() {
  const target = clubTarget("DJ_BOOTH");
  const pos = useGame.getState().playerPos;
  return (
    !!target &&
    Math.hypot(
      pos[0] - target.position.x,
      pos[1] - 0.83 - target.position.y,
      pos[2] - target.position.z,
    ) <
      target.radius + 1
  );
}

function MusicEmpty({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="club-empty-state">
      <ClubMusicIcon name="music" />
      <strong>{title}</strong>
      <p>{children}</p>
    </div>
  );
}

/** Player requests and DJ controls share one room snapshot and the existing server commands. */
export function ClubMusicPanel({
  nearBooth,
  onClose,
}: {
  nearBooth: boolean;
  onClose: () => void;
}) {
  const s = useClub();
  const connected = useNet((n) => n.connected);
  const audio = useClubYoutubeUi();
  const [tab, setTab] = useState<MusicTab>("music");
  const [track, setTrack] = useState<string>(CLUB_TRACKS[0].id);
  const [url, setUrl] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [pending, setPending] = useState<MusicAction | null>(null);
  const [feedback, setFeedback] = useState("");
  const pendingRef = useRef(false);
  const mounted = useRef(true);
  const data = s.data;
  const dj = !!data && data.activeDjId === connectionId;
  const canDj = dj && nearBooth;
  const waitingIndex = data?.waiting.indexOf(connectionId) ?? -1;
  const unavailable = !connected || !data || s.busy || pending !== null;
  const djName = data?.members[data.activeDjId ?? ""]?.name;
  const waiting = data?.waiting ?? [];
  const myRequests = data?.requests.filter((r) => r.from === connectionId) ?? [];
  const selectedTrack = CLUB_TRACKS.find((t) => t.id === track);
  const validUrl = !!parseYoutubeId(url);
  const playing = data?.playbackStatus === "playing";
  const elapsed = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    const update = () => setSeconds(data ? Math.floor(playbackPosition(data, clubNow())) : 0);
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, [data]);

  async function act(action: MusicAction, payload: Record<string, unknown> = {}, message = "") {
    const latest = useClub.getState();
    const before = latest.data;
    if (
      pendingRef.current ||
      latest.busy ||
      !latest.inside ||
      !before ||
      !useNet.getState().connected
    )
      return false;
    const activeDj = before.activeDjId === connectionId;
    // Recheck privileges at tap time, including movement/transfer since the last render.
    if (DJ_ACTIONS.has(action) && (!activeDj || !atDjBooth())) return false;
    if (action === "apply" && (activeDj || before.waiting.includes(connectionId) || !atDjBooth()))
      return false;
    if (action === "leave-dj" && !activeDj && !before.waiting.includes(connectionId)) return false;
    pendingRef.current = true;
    setPending(action);
    setFeedback("");
    try {
      await clubCommand(action, payload);
      const after = useClub.getState();
      // clubCommand catches server errors. Resolution alone does not mean a command succeeded.
      const confirmed =
        mounted.current &&
        after.inside &&
        !after.error &&
        after.data?.roomId === before.roomId &&
        after.data.revision > before.revision;
      if (confirmed && message) setFeedback(message);
      return confirmed;
    } finally {
      pendingRef.current = false;
      if (mounted.current) setPending(null);
    }
  }

  const reorder = (id: string, direction: number) => {
    const order = useClub.getState().data?.queue.map((item) => item.id) ?? [];
    const index = order.indexOf(id);
    const next = index + direction;
    if (index < 0 || next < 0 || next >= order.length) return;
    [order[index], order[next]] = [order[next]!, order[index]!];
    void act("reorder", { order });
  };

  const djAction = (
    <div className="club-dj-actions">
      {dj || waitingIndex >= 0 ? (
        <GameButton disabled={unavailable} onClick={() => void act("leave-dj")}>
          {pending === "leave-dj" ? "Sebentar…" : dj ? "Selesai jadi DJ" : "Batal antre DJ"}
        </GameButton>
      ) : (
        <GameButton
          className="club-button-orange"
          disabled={unavailable || !nearBooth}
          onClick={() => void act("apply")}
        >
          <ClubMusicIcon name="headphones" />
          {pending === "apply" ? "Mendaftar…" : "Jadi DJ"}
        </GameButton>
      )}
    </div>
  );

  return (
    <GameModal
      title="Musik Underground"
      subtitle="Pilih lagu, ikut antre, ramaikan lantai dansa!"
      onClose={onClose}
      wide
      className="club-music-panel"
      bodyClassName="club-music-body"
    >
      <aside className="club-music-sidebar" aria-label="Musik saat ini">
        <section className="club-now-playing">
          <span className="club-playback-badge" data-playing={playing}>
            {!data
              ? "Menghubungkan…"
              : playing
                ? "Sedang diputar"
                : data.playbackStatus === "paused"
                  ? "Lagu dijeda"
                  : "Menunggu lagu"}
          </span>
          <div className="club-record" aria-hidden="true">
            <svg viewBox="0 0 160 160" focusable="false">
              <circle cx="80" cy="80" r="74" fill="#dfcff5" />
              <circle cx="80" cy="80" r="59" fill="#795d86" />
              <circle cx="80" cy="80" r="47" fill="none" stroke="#a089ac" strokeWidth="2" />
              <circle cx="80" cy="80" r="35" fill="none" stroke="#a089ac" strokeWidth="2" />
              <circle cx="80" cy="80" r="23" fill="#ffe1a3" />
              <circle cx="80" cy="80" r="6" fill="#795d86" />
              <path
                d="m29 20 3 9 9 3-9 3-3 9-3-9-9-3 9-3zm103 97 3 8 8 3-8 3-3 8-3-8-8-3 8-3Z"
                fill="#fff9ef"
              />
            </svg>
          </div>
          <h3>{trackTitle(data?.mediaId)}</h3>
          <p className="club-playing-meta">
            {data?.mediaId ? (
              <>
                <span>{elapsed}</span> berlalu ·{" "}
                {data.provider === "youtube" ? "YouTube" : "Katalog klub"}
              </>
            ) : (
              "Lagu berikutnya menunggumu"
            )}
          </p>
          <GameButton
            className="club-volume-button"
            aria-pressed={audio.muted}
            onClick={toggleClubMusicMute}
          >
            <ClubMusicIcon name={audio.muted ? "muted" : "volume"} />
            {audio.muted ? "Nyalakan musik" : "Bisukan musik"}
          </GameButton>
          <small>Hanya mengatur suaramu</small>
        </section>
        <section className="club-dj-card">
          <div className="club-dj-avatar">
            <ClubMusicIcon name="headphones" />
          </div>
          <span className="club-eyebrow">{dj ? "Kamu DJ-nya!" : "Di balik meja DJ"}</span>
          <h3>
            {!data ? "Memuat DJ…" : (djName ?? (data.activeDjId ? "DJ klub" : "Booth tersedia"))}
          </h3>
          <p>
            {dj
              ? nearBooth
                ? "Saatnya bikin suasana seru."
                : "Dekati booth untuk mengatur musik."
              : waitingIndex >= 0
                ? "Tetap di klub sambil menunggu giliran."
                : nearBooth
                  ? "Mau pilih musik untuk semua?"
                  : "Dekati booth untuk jadi DJ."}
          </p>
          {waitingIndex >= 0 && (
            <span className="club-dj-position">Giliran DJ #{waitingIndex + 1}</span>
          )}
          {djAction}
        </section>
      </aside>
      <div className="club-music-main">
        <GameTabs
          value={tab}
          onChange={setTab}
          tabs={[
            { id: "music", label: "Lagu" },
            { id: "queue", label: "Antrean" },
            { id: "dj", label: "Ruang DJ" },
          ]}
        />
        <div className="club-music-content">
          <div className="club-status-stack" aria-live="polite">
            {!connected && (
              <p className="club-notice" data-tone="warning">
                Koneksi terputus. Tunggu sebentar, kami sedang menyambungkan kembali.
              </p>
            )}
            {connected && !data && <p className="club-notice">Menyiapkan musik klub…</p>}
            {s.error && (
              <p role="alert" className="club-notice" data-tone="error">
                {s.error}
              </p>
            )}
            {feedback && !s.error && (
              <p role="status" className="club-notice" data-tone="success">
                {feedback}
              </p>
            )}
            {audio.status === "autoplay-blocked" && (
              <div className="club-notice" data-tone="warning">
                <p>Musik belum terdengar? Ketuk untuk mulai mendengarkan.</p>
                <GameButton
                  className="club-button-primary"
                  disabled={!audio.resume}
                  onClick={() => audio.resume?.()}
                >
                  <ClubMusicIcon name="play" />
                  Aktifkan musik
                </GameButton>
              </div>
            )}
            {(audio.status === "failed" || audio.status === "unavailable") && (
              <p className="club-notice" data-tone="warning">
                Lagu ini belum bisa diputar. DJ dapat memilih lagu lain.
              </p>
            )}
          </div>

          {tab === "music" && (
            <>
              <div className="club-section-heading">
                <div>
                  <h3>Mau dengar apa?</h3>
                  <p>Pilih lagu, lalu kirim request ke DJ.</p>
                </div>
                <span className="club-count">
                  <ClubMusicIcon name="music" />
                </span>
              </div>
              <div className="club-track-list" role="group" aria-label="Pilih lagu untuk request">
                {REQUEST_TRACKS.map((item) => (
                  <GameButton
                    key={item.id}
                    className="club-track-choice"
                    aria-pressed={track === item.id}
                    disabled={!item.youtubeId || !!pending}
                    onClick={() => setTrack(item.id)}
                  >
                    <span className="club-track-art">
                      <ClubMusicIcon name="music" />
                    </span>
                    <span className="club-track-info">
                      <strong>{item.title}</strong>
                      <small>Koleksi Underground</small>
                    </span>
                    {track === item.id && (
                      <span className="club-selection-mark">
                        <ClubMusicIcon name="check" />
                      </span>
                    )}
                  </GameButton>
                ))}
              </div>
              <div className="club-request-footer">
                <GameButton
                  className="club-button-primary"
                  disabled={unavailable || !selectedTrack?.youtubeId}
                  onClick={() =>
                    void act(
                      "request",
                      { mediaId: track },
                      "Request terkirim! Tunggu DJ memasukkannya ke antrean.",
                    )
                  }
                >
                  <ClubMusicIcon name="music" />
                  {pending === "request" ? "Mengirim…" : "Kirim request"}
                </GameButton>
                <p>
                  Maks. 2 request menunggu · jeda 15 detik.
                  <br />
                  DJ memilih request yang masuk antrean.
                </p>
              </div>
              {myRequests.length > 0 && (
                <section className="club-dj-section">
                  <h3>Request kamu</h3>
                  {myRequests.map((item) => (
                    <p key={item.id}>{trackTitle(item.mediaId)} · Menunggu DJ</p>
                  ))}
                </section>
              )}
            </>
          )}

          {tab === "queue" && (
            <>
              <div className="club-section-heading">
                <div>
                  <h3>Setelah lagu ini</h3>
                  <p>
                    {canDj
                      ? "Atur urutan lagu dengan tombol panah."
                      : "Lagu yang sudah dipilih DJ untuk diputar."}
                  </p>
                </div>
                <span className="club-count">{data?.queue.length ?? 0}</span>
              </div>
              {data &&
                (data.queue.length ? (
                  <ol className="club-queue-list">
                    {data.queue.map((item, index) => (
                      <li className="club-track-row" key={item.id}>
                        <span className="club-track-number">{index + 1}</span>
                        <span className="club-track-info">
                          <strong>{trackTitle(item.mediaId)}</strong>
                          <small>Dari {data.members[item.from]?.name ?? "pengunjung"}</small>
                        </span>
                        {canDj && (
                          <div className="club-row-actions">
                            {([-1, 1] as const).map((direction) => (
                              <GameIconButton
                                key={direction}
                                className="club-icon-action"
                                label={`${direction < 0 ? "Naikkan" : "Turunkan"} ${trackTitle(item.mediaId)}`}
                                disabled={
                                  unavailable ||
                                  index + direction < 0 ||
                                  index + direction >= data.queue.length
                                }
                                onClick={() => reorder(item.id, direction)}
                              >
                                <ClubMusicIcon name={direction < 0 ? "up" : "down"} />
                              </GameIconButton>
                            ))}
                          </div>
                        )}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <>
                    <MusicEmpty title="Antrean masih kosong">
                      Yuk, pilih lagu favoritmu. Request yang disetujui DJ akan muncul di sini.
                    </MusicEmpty>
                    <GameButton className="club-button-primary" onClick={() => setTab("music")}>
                      <ClubMusicIcon name="music" />
                      Pilih lagu
                    </GameButton>
                  </>
                ))}
            </>
          )}

          {tab === "dj" &&
            (canDj ? (
              <>
                <div className="club-section-heading">
                  <div>
                    <h3>Panggungmu, musikmu</h3>
                    <p>Atur lagu dan suasana untuk semua di klub.</p>
                  </div>
                  <span className="club-count">
                    <ClubMusicIcon name="headphones" />
                  </span>
                </div>
                <section className="club-dj-section">
                  <form
                    className="club-url-form"
                    onSubmit={async (event) => {
                      event.preventDefault();
                      if (!validUrl) return;
                      const submitted = url;
                      if (await act("set-url", { url: submitted.trim() }, "Lagumu siap diputar!"))
                        setUrl((current) => (current === submitted ? "" : current));
                    }}
                  >
                    <label htmlFor="club-youtube-url">Putar lagu dari YouTube</label>
                    <div className="club-url-row">
                      <input
                        id="club-youtube-url"
                        aria-label="Link YouTube"
                        aria-describedby="club-youtube-help"
                        aria-invalid={!!url && !validUrl}
                        placeholder="Tempel link YouTube di sini"
                        autoComplete="off"
                        autoCapitalize="none"
                        spellCheck={false}
                        value={url}
                        disabled={unavailable}
                        onChange={(event) => setUrl(event.target.value)}
                      />
                      <GameButton
                        type="submit"
                        className="club-button-primary"
                        disabled={unavailable || !validUrl}
                      >
                        <ClubMusicIcon name="play" />
                        {pending === "set-url" ? "Memuat…" : "Putar"}
                      </GameButton>
                    </div>
                    <small id="club-youtube-help">
                      {url && !validUrl
                        ? "Link belum dikenali. Gunakan link video YouTube."
                        : "Lagu ini langsung menggantikan musik yang diputar."}
                    </small>
                  </form>
                  <div className="club-playback-controls">
                    <GameButton
                      className="club-button-soft"
                      disabled={unavailable || (!data?.mediaId && !data?.queue.length)}
                      onClick={() => void act(playing ? "pause" : "play")}
                    >
                      <ClubMusicIcon name={playing ? "pause" : "play"} />
                      {playing ? "Jeda" : "Lanjutkan"}
                    </GameButton>
                    <GameButton disabled={unavailable} onClick={() => void act("next")}>
                      <ClubMusicIcon name="next" />
                      Berikutnya
                    </GameButton>
                  </div>
                </section>
                <section className="club-dj-section">
                  <h3>Warna lampu dansa</h3>
                  <div className="club-lighting-options">
                    {(
                      [
                        { id: "neon", label: "Neon" },
                        { id: "sunset", label: "Senja" },
                        { id: "ocean", label: "Laut" },
                      ] as const
                    ).map((light) => (
                      <GameButton
                        key={light.id}
                        aria-pressed={data?.lighting === light.id}
                        disabled={unavailable}
                        onClick={() => void act("lighting", { lighting: light.id })}
                      >
                        <span className="club-light-swatch" data-lighting={light.id} />
                        {light.label}
                        {data?.lighting === light.id && <ClubMusicIcon name="check" />}
                      </GameButton>
                    ))}
                  </div>
                </section>
                <section className="club-dj-section">
                  <div className="club-section-heading">
                    <div>
                      <h3>Request masuk</h3>
                      <p>Masukkan pilihanmu ke antrean lagu.</p>
                    </div>
                    <span className="club-count">{data?.requests.length ?? 0}</span>
                  </div>
                  {data?.requests.length ? (
                    <div className="club-requests-list">
                      {data.requests.map((item) => (
                        <div className="club-track-row" key={item.id}>
                          <span className="club-track-info">
                            <strong>{trackTitle(item.mediaId)}</strong>
                            <small>Dari {data.members[item.from]?.name ?? "pengunjung"}</small>
                          </span>
                          <div className="club-row-actions club-request-actions">
                            <GameButton
                              className="club-button-primary"
                              aria-label={`Terima ${trackTitle(item.mediaId)}`}
                              disabled={unavailable}
                              onClick={() => void act("accept", { id: item.id })}
                            >
                              <ClubMusicIcon name="check" />
                              Terima
                            </GameButton>
                            <GameIconButton
                              className="club-icon-action"
                              label={`Tolak ${trackTitle(item.mediaId)}`}
                              disabled={unavailable}
                              onClick={() => void act("reject", { id: item.id })}
                            >
                              <ClubMusicIcon name="close" />
                            </GameIconButton>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Belum ada request. Tunggu pilihan teman-temanmu!</p>
                  )}
                </section>
                <section className="club-dj-section">
                  <div className="club-section-heading">
                    <div>
                      <h3>Giliran DJ berikutnya</h3>
                      <p>Berbagi panggung dengan teman di klub.</p>
                    </div>
                    <span className="club-count">{waiting.length}</span>
                  </div>
                  {waiting.length ? (
                    <div className="club-waiting-list">
                      {waiting.map((id, index) => (
                        <div className="club-waiting-row" key={id}>
                          <span>
                            {index + 1}. {data?.members[id]?.name ?? "Pengunjung"}
                          </span>
                          <GameButton
                            className="club-button-soft"
                            aria-label={`Serahkan ke ${data?.members[id]?.name ?? "pengunjung"}`}
                            disabled={unavailable}
                            onClick={() => void act("transfer", { target: id })}
                          >
                            Serahkan DJ
                          </GameButton>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p>Belum ada yang antre jadi DJ.</p>
                  )}
                </section>
              </>
            ) : (
              <>
                <div className="club-section-heading">
                  <div>
                    <h3>Mau jadi DJ?</h3>
                    <p>Gantian pilih musik dan warna lampu dansa.</p>
                  </div>
                  <span className="club-count">
                    <ClubMusicIcon name="headphones" />
                  </span>
                </div>
                <MusicEmpty
                  title={
                    dj
                      ? "Meja DJ menunggumu"
                      : waitingIndex >= 0
                        ? `Kamu di giliran #${waitingIndex + 1}`
                        : "Giliranmu bikin suasana seru"
                  }
                >
                  {dj
                    ? "Dekati booth DJ untuk memutar lagu, memilih request, dan mengatur lampu."
                    : waitingIndex >= 0
                      ? "Nikmati musik dulu. Kamu bisa mengatur lagu setelah mendapat giliran DJ."
                      : nearBooth
                        ? "Ketuk jadi DJ di kartu DJ untuk bergabung."
                        : "Dekati booth DJ di dalam klub, lalu ketuk jadi DJ."}
                </MusicEmpty>
              </>
            ))}
        </div>
      </div>
    </GameModal>
  );
}
