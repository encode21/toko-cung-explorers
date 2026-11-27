import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Clapperboard, MessageCircle, Pause, Play, SquarePen } from "lucide-react";
import { MAX_TEXT, type Post } from "@/game/sosmed/sosmed";
import { sosmedRequest, useSosmed, SOSMED_REFRESH_MS } from "@/game/sosmed/store";
import { useProfile } from "@/identity/profile-store";
import { PhoneAppArtwork } from "./PhoneAppArtwork";
import { PhoneAppScreen } from "./PhonePanel";
import { SosmedComments } from "./SosmedComments";
import "./sosmed.css";

function Clip({ frames }: { frames: string[] }) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(
    () =>
      typeof window !== "undefined" &&
      !window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    if (!playing || frames.length < 2) return;
    const timer = window.setInterval(() => setIndex((i) => (i + 1) % frames.length), 350);
    return () => window.clearInterval(timer);
  }, [playing, frames.length]);
  if (!frames.length) return null;
  return (
    <div className="sosmed-media">
      <img
        className="sosmed-clip"
        src={frames[index % frames.length]}
        alt="Klip rekaman di Toko Cung World"
      />
      {frames.length > 1 && (
        <button
          type="button"
          className="sosmed-play"
          aria-label={playing ? "Jeda klip" : "Putar klip"}
          onClick={() => setPlaying(!playing)}
        >
          {playing ? <Pause aria-hidden /> : <Play aria-hidden />}
        </button>
      )}
    </div>
  );
}
function PublishedClip({ id }: { id: number }) {
  const frames = useSosmed((s) => s.media[id]);
  const [error, setError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (frames || !root.current) return;
    let cancelled = false,
      requested = false;
    const account = useSosmed.getState().account;
    const observer = new IntersectionObserver((entries) => {
      if (requested || !entries.some((e) => e.isIntersecting)) return;
      requested = true;
      setError("");
      void sosmedRequest<{ frames: string[] }>("clip", { postId: id })
        .then((data) => {
          if (!cancelled && account === useSosmed.getState().account)
            useSosmed.setState((s) => ({ media: { ...s.media, [id]: data.frames } }));
        })
        .catch((e: Error) => {
          if (!cancelled) setError(e.message);
        });
    });
    observer.observe(root.current);
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [id, frames, attempt]);
  return (
    <div ref={root} className="sosmed-clip-loader">
      {frames ? (
        <Clip frames={frames} />
      ) : error ? (
        <p role="alert">
          {error}{" "}
          <button type="button" onClick={() => setAttempt((a) => a + 1)}>
            Muat ulang klip
          </button>
        </p>
      ) : (
        <p>Memuat klip…</p>
      )}
    </div>
  );
}
function AuthorAvatar({ name }: { name: string }) {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join("")
    .toUpperCase();
  return (
    <span className="sosmed-avatar" aria-hidden="true" data-tone={name.length % 4}>
      {initials}
    </span>
  );
}
function postTime(age: number, at: number) {
  if (age < 60) return "Baru saja";
  if (age < 3600) return Math.floor(age / 60) + " menit lalu";
  if (age < 86400) return Math.floor(age / 3600) + " jam lalu";
  return new Date(at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
function PostCard({ post, now }: { post: Post; now: number }) {
  const [open, setOpen] = useState(false);
  const threadId = useId();
  return (
    <article className="sosmed-post" aria-label={"Kiriman " + post.author}>
      <header className="sosmed-byline">
        <AuthorAvatar name={post.author} />
        <div>
          <strong>{post.author}</strong>
          <time dateTime={new Date(post.at).toISOString()}>
            {postTime(Math.max(0, (now - post.at) / 1000), post.at)}
          </time>
        </div>
      </header>
      {post.text && <p className="sosmed-copy">{post.text}</p>}
      {post.hasClip && <PublishedClip id={post.id} />}
      <button
        className="sosmed-comment-toggle"
        type="button"
        aria-expanded={open}
        aria-controls={threadId}
        onClick={() => setOpen(!open)}
      >
        <MessageCircle aria-hidden />
        {post.commentCount} komentar
      </button>
      {open && (
        <div id={threadId}>
          <SosmedComments postId={post.id} />
        </div>
      )}
    </article>
  );
}
export function SosmedApp() {
  const {
    posts,
    draft,
    text,
    busy,
    loading,
    error,
    hasMore,
    account,
    publish,
    setDraft,
    setText,
    read,
    bind,
  } = useSosmed();
  const profile = useProfile((s) => s.profile);
  const formId = useId();
  const [composing, setComposing] = useState(draft.length > 0 || !!text);
  const [clipsOnly, setClipsOnly] = useState(false);
  const [withClip, setWithClip] = useState(true);
  const [now, setNow] = useState(Date.now);
  const feedRef = useRef<HTMLDivElement>(null);
  const composeButton = useRef<HTMLButtonElement>(null);
  const scrollTop = useRef(0);
  const restoreFocus = useRef(false);
  useEffect(() => {
    bind(profile?.id ?? null);
  }, [profile?.id, bind]);
  useEffect(() => {
    if (composing || !account) return;
    let cancelled = false;
    const refresh = () => {
      if (!document.hidden && !cancelled) {
        setNow(Date.now());
        void read("poll", clipsOnly);
      }
    };
    if (!document.hidden) void read("initial", clipsOnly);
    const timer = window.setInterval(refresh, SOSMED_REFRESH_MS);
    document.addEventListener("visibilitychange", refresh);
    window.addEventListener("online", refresh);
    return () => {
      cancelled = true;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", refresh);
      window.removeEventListener("online", refresh);
    };
  }, [composing, account, clipsOnly, read]);
  useLayoutEffect(() => {
    if (!composing && restoreFocus.current) {
      if (feedRef.current) feedRef.current.scrollTop = scrollTop.current;
      composeButton.current?.focus({ preventScroll: true });
      restoreFocus.current = false;
    }
  }, [composing]);
  const showFeed = () => {
    restoreFocus.current = true;
    setNow(Date.now());
    setComposing(false);
  };
  const canPublish = !!(text.trim() || (withClip && draft.length)) && !busy;
  const visiblePosts = clipsOnly ? posts.filter((post) => post.hasClip) : posts;
  const name = profile?.displayName ?? "Kamu";
  return (
    <PhoneAppScreen
      app="sosmed"
      title={
        composing ? (
          "Buat status"
        ) : (
          <span className="sosmed-brand">
            <PhoneAppArtwork kind="sosmed" />
            CungGram
          </span>
        )
      }
      backAction={composing ? { label: "Kembali ke beranda", onClick: showFeed } : null}
      headerAction={
        composing ? (
          <button type="submit" form={formId} className="sosmed-action" disabled={!canPublish}>
            {busy ? "Mengirim…" : "Bagikan"}
          </button>
        ) : (
          <button
            type="button"
            ref={composeButton}
            className="sosmed-action"
            aria-label="Tulis status"
            onClick={() => {
              scrollTop.current = feedRef.current?.scrollTop ?? 0;
              setComposing(true);
            }}
          >
            <SquarePen aria-hidden />
            Tulis
          </button>
        )
      }
    >
      <div className="sosmed" data-sosmed>
        {error && (
          <p role="alert" className="sosmed-error">
            {error}{" "}
            {!composing && (
              <button type="button" onClick={() => void read("new", clipsOnly)}>
                Coba lagi
              </button>
            )}
          </p>
        )}
        {composing ? (
          <form
            id={formId}
            className="sosmed-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (!canPublish || !(await publish(withClip))) return;
              setClipsOnly(false);
              setWithClip(true);
              scrollTop.current = 0;
              showFeed();
            }}
          >
            <div className="sosmed-byline">
              <AuthorAvatar name={name} />
              <strong>{name}</strong>
            </div>
            <textarea
              aria-label="Isi status"
              autoFocus={!draft.length}
              value={text}
              maxLength={MAX_TEXT}
              disabled={busy}
              placeholder="Apa kabar dari kotamu?"
              onChange={(e) => setText(e.target.value)}
            />
            <div className="sosmed-count">
              {text.length}/{MAX_TEXT}
            </div>
            {draft.length > 0 && (
              <div className="sosmed-attachment">
                <div className="sosmed-attachment-tools">
                  <label>
                    <input
                      type="checkbox"
                      checked={withClip}
                      disabled={busy}
                      onChange={(e) => setWithClip(e.target.checked)}
                    />
                    Lampirkan klip
                  </label>
                  <button type="button" disabled={busy} onClick={() => setDraft([])}>
                    Hapus draf
                  </button>
                </div>
                {withClip && <Clip frames={draft} />}
              </div>
            )}
          </form>
        ) : (
          <>
            <div role="group" aria-label="Filter kiriman" className="sosmed-filters">
              {(["Beranda", "Klip"] as const).map((label) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={clipsOnly === (label === "Klip")}
                  onClick={() => {
                    setClipsOnly(label === "Klip");
                    feedRef.current?.scrollTo({ top: 0 });
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <div
              className="sosmed-list"
              role="region"
              aria-label={clipsOnly ? "Kiriman klip" : "Beranda CungGram"}
              ref={feedRef}
            >
              <button
                type="button"
                className="sosmed-more"
                disabled={loading}
                onClick={() => void read("new", clipsOnly)}
              >
                {loading ? "Memuat…" : "Perbarui beranda"}
              </button>
              {visiblePosts.map((post) => (
                <PostCard key={account + ":" + post.id} post={post} now={now} />
              ))}
              {!visiblePosts.length && (
                <div className="sosmed-empty">
                  <Clapperboard aria-hidden />
                  <strong>
                    {loading
                      ? "Memuat kiriman…"
                      : clipsOnly
                        ? "Belum ada klip"
                        : "Belum ada kiriman"}
                  </strong>
                  {!loading && (
                    <p>
                      {clipsOnly
                        ? "Rekam kejadian di kota, lalu bagikan klipnya di sini."
                        : "Bagikan kabar pertama untuk semua player."}
                    </p>
                  )}
                </div>
              )}
              {hasMore && (
                <button
                  type="button"
                  className="sosmed-more"
                  disabled={loading}
                  onClick={() => void read("older", clipsOnly)}
                >
                  {loading ? "Memuat…" : "Kiriman sebelumnya"}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </PhoneAppScreen>
  );
}
