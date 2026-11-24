import { useEffect, useState } from "react";
import {
  MAX_TEXT,
  VIRAL_SECONDS,
  formatCount,
  npcPosts,
  viralComments,
  viralLikes,
  viralViews,
  type Post,
} from "@/game/sosmed/sosmed";
import { useSosmed } from "@/game/sosmed/store";
import "./sosmed.css";

/** Clip as a flipbook loop. */
function Flipbook({ frames }: { frames: string[] }) {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((n) => n + 1), 350);
    return () => clearInterval(t);
  }, []);
  return <img className="sosmed-clip" src={frames[i % frames.length]} alt="Klip" />;
}

function PostCard({ post, now }: { post: Post; now: number }) {
  const age = (now - post.at) / 1000;
  const views = post.peak ? viralViews(age, post.peak) : 0;
  const comments = post.peak ? viralComments(age, post.at) : [];
  return (
    <article className="sosmed-post">
      <strong>{post.author}</strong>
      <p>{post.text}</p>
      {post.frames.length > 0 && <Flipbook frames={post.frames} />}
      {post.peak ? (
        <small>
          👁 {formatCount(views)} views · ❤ {formatCount(viralLikes(views))}
          {age < VIRAL_SECONDS && " 🔥"}
        </small>
      ) : (
        !post.mine && <small>{Math.max(1, Math.round(age / 60))} menit lalu</small>
      )}
      {comments.map((c, n) => (
        <p key={n} className="sosmed-comment">
          <b>{c.who}</b> {c.text}
        </p>
      ))}
    </article>
  );
}

/** CungGram: feed (own + NPC posts) and a status box with an optional clip from "Rekam". */
export function SosmedApp() {
  const { posts, draft, publish, setDraft } = useSosmed();
  const [tab, setTab] = useState<"feed" | "status">(draft.length ? "status" : "feed");
  const [text, setText] = useState("");
  const [now, setNow] = useState(Date.now());
  const [withClip, setWithClip] = useState(true);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const feed = [...posts, ...npcPosts(now)].sort((a, b) => b.at - a.at);
  return (
    <div className="sosmed" data-sosmed>
      <div className="sosmed-tabs" role="tablist">
        {(["feed", "status"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t === "feed" ? "Beranda" : "Update Status"}
          </button>
        ))}
      </div>
      {tab === "feed" ? (
        <div className="sosmed-list">
          {feed.map((p) => (
            <PostCard key={p.id} post={p} now={now} />
          ))}
        </div>
      ) : (
        <form
          className="sosmed-form"
          onSubmit={(e) => {
            e.preventDefault();
            publish(text, withClip);
            setText("");
            setTab("feed");
          }}
        >
          <textarea
            value={text}
            maxLength={MAX_TEXT}
            placeholder="Lagi ngapain, Cung?"
            onChange={(e) => setText(e.target.value)}
          />
          <small>
            {text.length}/{MAX_TEXT}
          </small>
          {draft.length > 0 && (
            <label className="sosmed-attach">
              <input
                type="checkbox"
                checked={withClip}
                onChange={(e) => setWithClip(e.target.checked)}
              />
              Lampirkan klip
              <button type="button" onClick={() => setDraft([])}>
                Hapus draft
              </button>
              {withClip && <Flipbook frames={draft} />}
            </label>
          )}
          <button type="submit" disabled={!text.trim() && !(withClip && draft.length)}>
            Posting
          </button>
        </form>
      )}
    </div>
  );
}
