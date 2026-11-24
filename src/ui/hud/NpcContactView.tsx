import { useState } from "react";
import { chatWithNpc } from "@/game/warung/store";
import type { NpcContact } from "@/game/warung/model";

/** CungChat > Kontak: a regular's profile, life chapters so far (future ones hidden) and today's chat. */
export function NpcContactView({ contact }: { contact: NpcContact }) {
  const [log, setLog] = useState<{ from: "npc" | "me"; text: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const answer = async (i: number) => {
    const chat = contact.chat;
    if (!chat || busy) return;
    setBusy(true);
    const reply = await chatWithNpc(contact.id, i);
    setBusy(false);
    if (reply)
      setLog([
        { from: "npc", text: chat.prompt },
        { from: "me", text: chat.options[i]!.label },
        { from: "npc", text: reply },
      ]);
  };
  const hearts = Math.max(0, Math.min(5, Math.ceil(contact.affinity / 2)));
  return (
    <div className="npc-contact">
      <section className="npc-contact-profile" aria-label={`Profil ${contact.name}`}>
        <strong>{contact.role}</strong>
        <small>
          {contact.visits}× belanja · Keakraban {"❤️".repeat(hearts) || "🤍"}
        </small>
      </section>
      <ol className="npc-contact-story" aria-label="Perjalanan hidup">
        {contact.story.map((s, i) => (
          <li key={s.trait} data-now={i === contact.stage || undefined}>
            <b>{s.trait}</b>
            <p>{s.story}</p>
          </li>
        ))}
        {Array.from({ length: contact.stages - contact.story.length }, (_, i) => (
          <li key={`next-${i}`} data-locked>
            <b>???</b>
            <p>Bab berikutnya terbuka saat warungmu makin laris.</p>
          </li>
        ))}
      </ol>
      {contact.bond && <p className="npc-contact-bond">💌 {contact.bond}</p>}
      <div className="warung-chat-log" role="log" aria-label={`Chat dengan ${contact.name}`}>
        {log.length ? (
          log.map((m, i) => (
            <div key={i} className="warung-chat-bubble" data-from={m.from}>
              {m.text}
            </div>
          ))
        ) : contact.chat ? (
          <div className="warung-chat-bubble" data-from="npc">
            {contact.chat.prompt}
          </div>
        ) : (
          <div className="warung-chat-bubble" data-from="sys">
            Sudah ngobrol hari ini. Besok lagi ya.
          </div>
        )}
      </div>
      {!log.length && contact.chat && (
        <div className="warung-chat-options" role="group" aria-label="Pilih balasan">
          {contact.chat.options.map((o, i) => (
            <button key={o.label} type="button" disabled={busy} onClick={() => void answer(i)}>
              {o.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
