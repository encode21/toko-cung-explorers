import { useEffect, useRef, useState } from "react";
import { INTRO_CLIPS } from "./story";
import "./intro.css";

export function StoryIntro({
  onFinish,
  replay = false,
}: {
  onFinish: () => void;
  replay?: boolean;
}) {
  const [index, setIndex] = useState(0);
  const [attempt, setAttempt] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const [error, setError] = useState(false);
  const [buffering, setBuffering] = useState(true);
  const [time, setTime] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const finished = useRef(false);
  const clip = INTRO_CLIPS[index]!;
  const finish = () => {
    if (!finished.current) {
      finished.current = true;
      onFinish();
    }
  };
  useEffect(() => {
    const el = video.current;
    if (!el) return;
    let alive = true;
    setTime(0);
    setError(false);
    setBuffering(true);
    // This effect owns the media source. StrictMode/Fast Refresh can run cleanup
    // and setup on the same node, so setup must restore what cleanup releases.
    el.src = `/assets/intro/${INTRO_CLIPS[index]!.id}.mp4`;
    el.load();
    void el.play().catch(() => {
      if (alive) setPaused(true);
    });
    const visibility = () => {
      if (document.hidden) {
        el.pause();
        setPaused(true);
      }
    };
    document.addEventListener("visibilitychange", visibility);
    return () => {
      alive = false;
      document.removeEventListener("visibilitychange", visibility);
      el.pause();
      el.removeAttribute("src");
      el.load();
    };
  }, [index, attempt]);
  useEffect(() => {
    if (!buffering || paused || error) return;
    const timeout = window.setTimeout(() => {
      if (!document.hidden) {
        video.current?.pause();
        setError(true);
      }
    }, 15000);
    return () => window.clearTimeout(timeout);
  }, [buffering, paused, error, index, attempt]);
  useEffect(() => {
    const next = INTRO_CLIPS[index + 1];
    if (!next) return;
    const preload = document.createElement("video");
    preload.preload = "auto";
    preload.muted = true;
    preload.src = `/assets/intro/${next.id}.mp4`;
    preload.load();
    return () => {
      preload.pause();
      preload.removeAttribute("src");
      preload.load();
    };
  }, [index]);
  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) void el.play().catch(() => setPaused(true));
    else el.pause();
  };
  return (
    <section className="story-intro" aria-label="Cerita pembuka Toko Cung World">
      <video
        key={clip.id}
        ref={video}
        poster={`/assets/intro/${clip.id}.jpg`}
        playsInline
        muted={muted}
        preload="auto"
        onPlaying={() => {
          setPaused(false);
          setBuffering(false);
        }}
        onWaiting={() => setBuffering(true)}
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
        onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
        onError={() => setError(true)}
        onEnded={() => (index < INTRO_CLIPS.length - 1 ? setIndex(index + 1) : finish())}
      />
      <header className="story-header">
        <img src="/logo-toko-cung-world.png" alt="Toko Cung World" />
        <button onClick={finish}>{replay ? "Kembali ke lobby" : "Lewati"}</button>
      </header>
      <div className="story-caption">
        <p className="story-chapter">CERITA {index + 1} / 4</p>
        <h1>{clip.title}</h1>
        <p>{clip.text}</p>
      </div>
      {buffering && !error && !paused && (
        <p className="story-buffering" role="status">
          Menyiapkan cerita…
        </p>
      )}
      {error && (
        <div className="story-error" role="alert">
          <p>Video belum bisa diputar.</p>
          <button
            onClick={() => {
              setError(false);
              setPaused(false);
              setAttempt((value) => value + 1);
            }}
          >
            Coba lagi
          </button>
          <button onClick={finish}>Lewati</button>
        </div>
      )}
      <footer className="story-controls">
        <div
          className="story-progress"
          role="progressbar"
          aria-label="Progres cerita"
          aria-valuemin={0}
          aria-valuemax={40}
          aria-valuenow={Math.min(40, index * 10 + time)}
        >
          {INTRO_CLIPS.map((c, i) => (
            <span key={c.id}>
              <i
                style={{
                  width: `${i < index ? 100 : i === index ? Math.min(100, time * 10) : 0}%`,
                }}
              />
            </span>
          ))}
        </div>
        <div>
          <button onClick={toggle}>{paused ? "Putar cerita" : "Jeda"}</button>
          <button onClick={() => setMuted(!muted)} aria-pressed={!muted}>
            {muted ? "Aktifkan suara" : "Matikan suara"}
          </button>
        </div>
      </footer>
    </section>
  );
}
