import { useCallback, useEffect, useRef, useState } from "react";
import { createId } from "@/lib/id";
import { MAX_TEXT, commentThreads, mergeRows, type Comment } from "@/game/sosmed/sosmed";
import { sosmedRequest, useSosmed } from "@/game/sosmed/store";

type Page = { comments: Comment[]; parents: Comment[]; hasMore: boolean; total: number };
export function SosmedComments({ postId }: { postId: number }) {
  const commentCount = useSosmed((s) => s.posts.find((p) => p.id === postId)?.commentCount ?? 0);
  const previousCount = useRef(commentCount);
  const [comments, setComments] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [reply, setReply] = useState<Comment | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [more, setMore] = useState(false);
  const rows = useRef<Comment[]>([]);
  const oldest = useRef<number | null>(null);
  const newest = useRef(0);
  const alive = useRef(false);
  const reading = useRef(false);
  const pending = useRef({ signature: "", id: "" });
  const textarea = useRef<HTMLTextAreaElement>(null);
  const merge = useCallback((data: Page) => {
    rows.current = mergeRows(rows.current, [...data.parents, ...data.comments]);
    setComments(rows.current);
    if (data.comments.length) {
      oldest.current = Math.min(oldest.current ?? Infinity, ...data.comments.map((c) => c.id));
      newest.current = Math.max(newest.current, ...data.comments.map((c) => c.id));
    }
  }, []);
  const read = useCallback(
    async (older = false) => {
      if (reading.current || document.hidden) return;
      reading.current = true;
      setLoading(true);
      setError("");
      try {
        const initial = !newest.current;
        const data = await sosmedRequest<Page>("comments", {
          postId,
          ...(older && oldest.current ? { beforeId: oldest.current } : {}),
          ...(!older && !initial ? { afterId: newest.current } : {}),
        });
        if (!alive.current) return;
        merge(data);
        useSosmed.setState((s) => ({
          posts: s.posts.map((p) => (p.id === postId ? { ...p, commentCount: data.total } : p)),
        }));
        if (initial || older) setMore(data.hasMore);
      } catch (e) {
        if (alive.current) setError((e as Error).message);
      } finally {
        reading.current = false;
        if (alive.current) setLoading(false);
      }
    },
    [postId, merge],
  );
  useEffect(() => {
    alive.current = true;
    void read();
    return () => {
      alive.current = false;
    };
  }, [read]);
  useEffect(() => {
    if (commentCount === previousCount.current) return;
    previousCount.current = commentCount;
    void read();
  }, [commentCount, read]);
  const send = async () => {
    if (busy || !text.trim()) return;
    const signature = JSON.stringify([text.trim(), reply?.id ?? null]);
    if (pending.current.signature !== signature) pending.current = { signature, id: createId() };
    setBusy(true);
    setError("");
    try {
      const data = await sosmedRequest<{ comment: Comment }>("comment", {
        postId,
        text: text.trim(),
        parentId: reply?.id ?? null,
        requestId: pending.current.id,
      });
      if (!alive.current) return;
      const existed = rows.current.some((c) => c.id === data.comment.id);
      // Do not advance the polling cursor past comments not yet fetched from other players.
      rows.current = mergeRows(rows.current, [data.comment]);
      setComments(rows.current);
      if (!existed)
        useSosmed.setState((s) => ({
          posts: s.posts.map((p) =>
            p.id === postId ? { ...p, commentCount: p.commentCount + 1 } : p,
          ),
        }));
      setText("");
      setReply(null);
      pending.current = { signature: "", id: "" };
      void read();
    } catch (e) {
      if (alive.current) setError((e as Error).message);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  return (
    <section className="sosmed-thread" aria-label="Percakapan">
      <button type="button" className="sosmed-more" disabled={loading} onClick={() => void read()}>
        Perbarui komentar
      </button>
      {more && (
        <button
          type="button"
          className="sosmed-more"
          disabled={loading}
          onClick={() => void read(true)}
        >
          Komentar sebelumnya
        </button>
      )}
      {!comments.length && !loading && <p>Belum ada komentar. Mulai obrolannya!</p>}
      <ul>
        {commentThreads(comments).map(({ root, replies }) => (
          <li key={root.id}>
            <strong>{root.author}</strong>
            <p>{root.text}</p>
            <button
              type="button"
              onClick={() => {
                setReply(root);
                textarea.current?.focus();
              }}
            >
              Balas
            </button>
            {!!replies.length && (
              <ul>
                {replies.map((c) => (
                  <li key={c.id}>
                    <strong>{c.author}</strong>
                    <p>{c.text}</p>
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ul>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        {reply && (
          <div className="sosmed-reply-to">
            Membalas {reply.author}
            <button type="button" onClick={() => setReply(null)}>
              Batal
            </button>
          </div>
        )}
        <textarea
          ref={textarea}
          aria-label={reply ? "Isi balasan" : "Isi komentar"}
          placeholder={reply ? "Tulis balasan…" : "Tulis komentar…"}
          value={text}
          maxLength={MAX_TEXT}
          disabled={busy}
          onChange={(e) => setText(e.target.value)}
        />
        <button className="sosmed-action" type="submit" disabled={busy || !text.trim()}>
          {busy ? "Mengirim…" : "Kirim"}
        </button>
        {error && (
          <p role="alert" className="sosmed-error">
            {error}{" "}
            <button type="button" onClick={() => (text.trim() ? void send() : void read())}>
              Coba lagi
            </button>
          </p>
        )}
      </form>
    </section>
  );
}
