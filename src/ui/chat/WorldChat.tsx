import { useEffect, useRef, useState } from "react";
import { Send } from "lucide-react";
import { useNet } from "@/net/net-store";
import { getActiveChannel, playerId, remoteStates, sendChat, useWorldChannel } from "@/net/useWorldChannel";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useProfile } from "@/identity/profile-store";

/** Koneksi realtime dunia — selalu terpasang, tanpa tampilan. */
export function WorldChat() {
  const name = useNet((s) => s.name) || "Pengunjung";
  const room = useNet((s) => s.room);
  const profile = useProfile((s) => s.profile);
  useWorldChannel(room, name, profile);
  return null;
}

type Tab = "nearby" | "world" | "private" | "system";
const TABS: { id: Tab; label: string }[] = [
  { id: "nearby", label: "Sekitar" },
  { id: "world", label: "Dunia" },
  { id: "private", label: "Pribadi" },
  { id: "system", label: "Sistem" },
];
const NEARBY_RADIUS = 18;

function isNearby(from: string) {
  if (from === playerId) return true;
  const r = remoteStates.get(from);
  if (!r) return false;
  const [x, , z] = useGame.getState().playerPos;
  return Math.hypot(r.x - x, r.z - z) < NEARBY_RADIUS;
}

const time = (at: number) => new Date(at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" });

/** Panel chat sosial bertab: Sekitar / Dunia / Pribadi / Sistem. */
export function ChatPanel() {
  const name = useNet((s) => s.name) || "Pengunjung";
  const chat = useNet((s) => s.chat);
  const roster = useNet((s) => s.roster);
  const events = useHud((s) => s.events);
  const [tab, setTab] = useState<Tab>("world");
  const [text, setText] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const list = tab === "nearby" ? chat.filter((m) => isNearby(m.from)) : tab === "world" ? chat : [];

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [list.length, tab]);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    sendChat(getActiveChannel(), name, value.slice(0, 200));
    setText("");
  };

  const canSend = tab === "nearby" || tab === "world";
  const others = roster.filter((p) => p.id !== playerId);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div role="tablist" className="grid grid-cols-4 gap-1 rounded-xl bg-world-panel p-1">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`min-h-9 rounded-lg px-2 text-xs font-semibold transition ${
              tab === t.id ? "bg-world-panel-foreground text-world-accent-foreground" : "text-world-muted hover:text-world-panel-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div ref={listRef} className="mt-3 min-h-32 flex-1 space-y-2 overflow-y-auto pr-1 text-sm">
        {tab === "private" &&
          (others.length === 0 ? (
            <p className="text-world-muted text-xs">Belum ada pemain lain di ruangan ini.</p>
          ) : (
            <>
              <p className="text-world-muted text-xs">Pesan pribadi segera hadir. Pemain di ruangan:</p>
              {others.map((p) => (
                <div key={p.id} className="flex items-center gap-2 rounded-xl bg-world-panel px-3 py-2">
                  <span className="grid size-7 place-items-center rounded-full bg-world-accent font-bold text-world-accent-foreground text-xs">
                    {p.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="truncate">{p.name}</span>
                </div>
              ))}
            </>
          ))}

        {tab === "system" &&
          (events.length === 0 ? (
            <p className="text-world-muted text-xs">Belum ada kabar dari dunia.</p>
          ) : (
            events.map((e) => (
              <p key={e.id} className="text-xs">
                <span className="text-world-muted">{time(e.at)}</span> · {e.text}
              </p>
            ))
          ))}

        {canSend && list.length === 0 && (
          <p className="text-world-muted text-xs">
            {tab === "nearby" ? "Belum ada obrolan di sekitarmu." : "Belum ada pesan. Sapa pemain lain di Toko Cung."}
          </p>
        )}
        {canSend &&
          list.map((m) => {
            const mine = m.from === playerId;
            return (
              <div key={m.id} className={`flex flex-col ${mine ? "items-end" : "items-start"}`}>
                <span className="mb-0.5 text-[10px] text-world-muted">
                  {mine ? "Kamu" : m.name} · {time(m.at)}
                </span>
                <span
                  className={`max-w-[85%] rounded-2xl px-3 py-1.5 ${
                    mine ? "bg-world-brand text-world-brand-foreground" : "bg-world-panel"
                  }`}
                >
                  {m.text}
                </span>
              </div>
            );
          })}
      </div>

      {canSend && (
        <form onSubmit={submit} className="mt-3 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={tab === "nearby" ? "Ngobrol dengan sekitar…" : "Kirim ke seluruh dunia…"}
            maxLength={200}
            className="min-h-11 min-w-0 flex-1 rounded-xl border border-world-outline bg-world-panel px-3 text-sm outline-none placeholder:text-world-muted"
          />
          <button
            type="submit"
            aria-label="Kirim"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-world-brand text-world-brand-foreground"
          >
            <Send className="size-4" />
          </button>
        </form>
      )}
    </div>
  );
}
