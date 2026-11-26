import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import {
  ChevronDown,
  Clapperboard,
  Eye,
  Heart,
  MessageCircle,
  Pause,
  Play,
  SquarePen,
} from "lucide-react";
import {
  MAX_TEXT,
  formatCount,
  npcPosts,
  viralComments,
  viralLikes,
  viralViews,
  type Post,
} from "@/game/sosmed/sosmed";
import { useSosmed } from "@/game/sosmed/store";
import { PhoneAppArtwork } from "./PhoneAppArtwork";
import { PhoneAppScreen } from "./PhonePanel";
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
      {name === "Koko Cung" ? <img src="/assets/beginner-guide/koko-cung.webp" alt="" /> : initials}
    </span>
  );
}

function postTime(age: number, at: number) {
  if (age < 60) return "Baru saja";
  if (age < 3600) return `${Math.floor(age / 60)} menit lalu`;
  if (age < 86400) return `${Math.floor(age / 3600)} jam lalu`;
  return new Date(at).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PostCard({ post, now }: { post: Post; now: number }) {
  const age = Math.max(0, (now - post.at) / 1000);
  const views = post.peak ? viralViews(age, post.peak) : 0;
  const comments = post.peak ? viralComments(age, post.at) : [];
  return (
    <article className="sosmed-post" aria-label={`Kiriman ${post.author}`}>
      <header className="sosmed-byline">
        <AuthorAvatar name={post.author} />
        <div>
          <strong>{post.author}</strong>
          <time dateTime={new Date(post.at).toISOString()}>{postTime(age, post.at)}</time>
        </div>
      </header>
      <p className="sosmed-copy">{post.text}</p>
      {post.frames.length > 0 && <Clip frames={post.frames} />}
      {!!post.peak && (
        <div className="sosmed-engagement">
          <div className="sosmed-stats">
            <span aria-label={`${views} tayangan`}>
              <Eye aria-hidden />
              {formatCount(views)} tayangan
            </span>
            <span aria-label={`${viralLikes(views)} suka`}>
              <Heart aria-hidden />
              {formatCount(viralLikes(views))} suka
            </span>
          </div>
          {comments.length > 0 && (
            <details className="sosmed-comments">
              <summary>
                <MessageCircle aria-hidden />
                {comments.length} komentar
                <ChevronDown aria-hidden />
              </summary>
              <ul>
                {comments.map((comment) => (
                  <li key={comment.who}>
                    <strong>{comment.who}</strong> {comment.text}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </div>
      )}
    </article>
  );
}

export function SosmedApp() {
  const { posts, draft, publish, setDraft } = useSosmed();
  const formId = useId();
  const [composing, setComposing] = useState(draft.length > 0);
  const [clipsOnly, setClipsOnly] = useState(false);
  const [text, setText] = useState("");
  const [withClip, setWithClip] = useState(true);
  const [now, setNow] = useState(Date.now);
  const feedRef = useRef<HTMLDivElement>(null);
  const composeButton = useRef<HTMLButtonElement>(null);
  const scrollTop = useRef(0);
  const restoreFocus = useRef(false);
  useEffect(() => {
    if (composing) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [composing]);
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
  const visiblePosts = clipsOnly
    ? posts.filter((post) => post.frames.length > 0)
    : [...posts, ...npcPosts(now)].sort((a, b) => b.at - a.at);
  const canPublish = !!(text.trim() || (withClip && draft.length));
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
            Bagikan
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
        {composing ? (
          <form
            id={formId}
            className="sosmed-form"
            onSubmit={(e) => {
              e.preventDefault();
              if (!canPublish) return;
              publish(text, withClip);
              setText("");
              setClipsOnly(false);
              setWithClip(true);
              scrollTop.current = 0;
              showFeed();
            }}
          >
            <div className="sosmed-byline">
              <AuthorAvatar name="Kamu" />
              <strong>Kamu</strong>
            </div>
            <textarea
              aria-label="Isi status"
              autoFocus={!draft.length}
              value={text}
              maxLength={MAX_TEXT}
              placeholder="Apa kabar dari warungmu?"
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
                      onChange={(e) => setWithClip(e.target.checked)}
                    />
                    Lampirkan klip
                  </label>
                  <button type="button" onClick={() => setDraft([])}>
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
              {visiblePosts.map((post) => (
                <PostCard key={post.id} post={post} now={now} />
              ))}
              {clipsOnly && !visiblePosts.length && (
                <div className="sosmed-empty">
                  <Clapperboard aria-hidden />
                  <strong>Belum ada klip</strong>
                  <p>Gunakan Rekam saat ada kejadian di kota, lalu bagikan klipnya di sini.</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </PhoneAppScreen>
  );
}
