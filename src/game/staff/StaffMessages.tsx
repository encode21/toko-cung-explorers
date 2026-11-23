import { useEffect } from "react";
import { staffCommand, useStaff } from "./store";
import "./staff.css";

/** NPC notices are persisted journal entries, visible again after reconnecting. */
export function StaffMessages() {
  const data = useStaff((s) => s.data);
  useEffect(() => {
    void staffCommand("state");
  }, []);
  if (!data?.messages.length) return null;
  return (
    <section className="staff-messages" aria-label={data.text.messages}>
      <h4>{data.text.messages}</h4>
      <ol className="warung-chat-thread">
        {data.messages.map((m) => (
          <li key={m.id} data-from="staff">
            <strong>{m.name}</strong>
            <p>{m.text}</p>
            <time dateTime={m.at}>
              {new Date(m.at).toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })} WIB
            </time>
          </li>
        ))}
      </ol>
    </section>
  );
}
