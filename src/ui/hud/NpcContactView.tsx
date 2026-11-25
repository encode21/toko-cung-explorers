import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { npcConversation } from "@/game/warung/store";
import { mergeNpcMessages, rupiah, type NpcContact, type NpcThread } from "@/game/warung/model";

type Pending = { action: "npc_start" | "npc_chat" | "npc_remind"; extra: Record<string, unknown> };
const time = (at: string) =>
  new Date(at).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

/** The server owns the transcript, active question, money and relationship. */
export function NpcContactView({ contact }: { contact: NpcContact }) {
  const [thread, setThread] = useState<NpcThread | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState<Pending | null>(null);
  const scroll = useRef<HTMLDivElement>(null);
  const mounted = useRef(true);
  const working = useRef(false);
  const position = useRef<{ height: number; top: number } | null>(null);
  const toBottom = useRef(true);

  const receive = (next: NpcThread, older = false) => {
    if (!mounted.current) return;
    const el = scroll.current;
    if (older && el) position.current = { height: el.scrollHeight, top: el.scrollTop };
    else if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 70) toBottom.current = true;
    setThread((current) => ({
      ...next,
      messages: mergeNpcMessages(current?.messages ?? [], next.messages),
      beforeId: older || !current ? next.beforeId : current.beforeId,
    }));
  };

  useEffect(() => {
    mounted.current = true;
    const refresh = async () => {
      if (working.current) return;
      working.current = true;
      try {
        const next = await npcConversation("npc_thread", contact.id);
        receive(next);
      } catch (e) {
        if (mounted.current) setError(e instanceof Error ? e.message : "Chat belum bisa dimuat.");
      } finally {
        working.current = false;
      }
    };
    void refresh();
    const timer = window.setInterval(() => void refresh(), 15_000);
    return () => {
      mounted.current = false;
      window.clearInterval(timer);
    };
  }, [contact.id]);

  useLayoutEffect(() => {
    const el = scroll.current;
    if (!el) return;
    if (position.current) {
      el.scrollTop = position.current.top + el.scrollHeight - position.current.height;
      position.current = null;
    } else if (toBottom.current) el.scrollTop = el.scrollHeight;
    toBottom.current = false;
  }, [thread]);

  const load = async (older = false) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    try {
      const next = await npcConversation(
        "npc_thread",
        contact.id,
        older && thread?.beforeId ? { beforeId: thread.beforeId } : {},
      );
      receive(next, older);
      if (mounted.current) {
        setError("");
        if (!older) setRetry(null);
      }
    } catch (e) {
      if (mounted.current) setError(e instanceof Error ? e.message : "Chat belum bisa dimuat.");
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const send = async (pending: Pending) => {
    if (working.current) return;
    working.current = true;
    setBusy(true);
    setError("");
    try {
      const next = await npcConversation(pending.action, contact.id, pending.extra);
      toBottom.current = true;
      receive(next);
      if (mounted.current) setRetry(null);
    } catch (e) {
      if (mounted.current) {
        setError(e instanceof Error ? e.message : "Pesan belum terkirim. Coba lagi.");
        setRetry(pending);
      }
    } finally {
      working.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  const act = (action: Pending["action"], extra: Record<string, unknown> = {}) =>
    void send({ action, extra: { ...extra, requestId: crypto.randomUUID() } });

  return (
    <div className="npc-contact">
      <details className="npc-contact-profile">
        <summary>
          <span>
            {contact.affinityLabel} · {contact.affinity}/10
          </span>
          <meter min={0} max={10} value={contact.affinity} aria-label="Keakraban" />
          <small>Profil & perjalanan hidup</small>
        </summary>
        <div className="npc-contact-profile-body">
          <strong>{contact.role}</strong>
          <small>{contact.visits}× belanja · 1 hari game = 48 menit nyata</small>
          <p>
            Setelah 3 hari game tanpa membalas, keakraban turun 1 poin per hari, maksimal 3 poin
            selama jeda.
          </p>
          <ol className="npc-contact-story" aria-label="Perjalanan hidup">
            {contact.story.map((s, i) => (
              <li key={i} data-now={i === contact.stage || undefined}>
                <b>{s.trait}</b>
                <p>{s.story}</p>
              </li>
            ))}
            {contact.story.length < contact.stages && (
              <li data-locked>
                <b>Bab berikutnya</b>
                <p>Lanjutkan percakapan dan kembangkan warungmu untuk membuka bab baru.</p>
              </li>
            )}
          </ol>
          {contact.bond && <p className="npc-contact-bond">{contact.bond}</p>}
        </div>
      </details>
      <div
        ref={scroll}
        className="warung-chat-log npc-chat-history"
        role="log"
        aria-label={`Chat dengan ${contact.name}`}
      >
        {thread?.beforeId && (
          <button type="button" disabled={busy} onClick={() => void load(true)}>
            Pesan sebelumnya
          </button>
        )}
        {!thread && !error && <p role="status">Memuat percakapan…</p>}
        {thread?.messages.map((m) => (
          <div key={m.id} className="warung-chat-bubble" data-from={m.from}>
            {m.text}
            <time dateTime={m.at}>{time(m.at)}</time>
          </div>
        ))}
        {thread && !thread.messages.length && (
          <p className="npc-chat-note">
            Belum ada riwayat yang tercatat. Sapa {contact.name} untuk mulai ngobrol.
          </p>
        )}
        {thread?.loans.map((loan) => (
          <section
            key={loan.id}
            className="npc-chat-loan"
            aria-label={`Pinjaman ${rupiah(loan.amount)}`}
          >
            <strong>Pinjaman {rupiah(loan.amount)}</strong>
            <small>
              {loan.status === "PAID"
                ? "Lunas"
                : loan.status === "DEFAULTED"
                  ? "Macet · belum dilunasi"
                  : `Jatuh tempo ${time(loan.dueAt)} WIB`}
            </small>
            {loan.status === "ACCEPTED" && (
              <div>
                <button
                  type="button"
                  disabled={busy || !!retry || !loan.canRemind}
                  onClick={() => act("npc_remind", { eventId: loan.id, tone: "good" })}
                >
                  Ingatkan baik-baik
                </button>
                <button
                  type="button"
                  disabled={busy || !!retry || !loan.canRemind}
                  onClick={() => act("npc_remind", { eventId: loan.id, tone: "harsh" })}
                >
                  Desak bayar sekarang
                </button>
                {!loan.canRemind && <small>Sudah diingatkan hari ini.</small>}
              </div>
            )}
          </section>
        ))}
        {thread && !thread.active && !thread.canStart && (
          <p className="npc-chat-note">Sudah ngobrol hari ini. Lanjut pada hari game berikutnya.</p>
        )}
      </div>
      {error && (
        <div className="npc-chat-error" role="alert">
          <p>{error}</p>
          {retry && (
            <button type="button" disabled={busy} onClick={() => void send(retry)}>
              Coba kirim lagi
            </button>
          )}
          <button type="button" disabled={busy} onClick={() => void load()}>
            Muat ulang chat
          </button>
        </div>
      )}
      {(thread?.active || thread?.canStart) && (
        <div className="warung-chat-options" role="group" aria-label="Pilih balasan">
          {thread?.active ? (
            thread.active.options.map((o, i) => (
              <button
                key={`${thread.active!.nodeId}-${i}`}
                type="button"
                disabled={busy || !!retry}
                onClick={() =>
                  act("npc_chat", {
                    sessionId: thread.active!.sessionId,
                    nodeId: thread.active!.nodeId,
                    option: i,
                  })
                }
              >
                {o.label}
              </button>
            ))
          ) : thread?.canStart ? (
            <button type="button" disabled={busy || !!retry} onClick={() => act("npc_start")}>
              Sapa {contact.name}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
