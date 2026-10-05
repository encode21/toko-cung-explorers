import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useOps } from "@/state/ops-store";
import { useNet } from "@/net/net-store";
import { useGame } from "@/state/game-store";
import { useHud, type FeedTone } from "@/state/hud-store";
import { playerId } from "@/net/useWorldChannel";

/** Menyalurkan kejadian dunia (ops, pemain, belanja, chat) ke feed HUD kiri. */
export function useFeedSources() {
  const push = useHud((s) => s.pushEvent);
  const roster = useNet((s) => s.roster);
  const chat = useNet((s) => s.chat);
  const prevRoster = useRef<Map<string, string>>(new Map());
  const lastChat = useRef(0);

  useEffect(
    () =>
      useOps.subscribe((s, prev) => {
        if (s.status !== prev.status && s.status) push(s.status, "ops");
      }),
    [push],
  );

  useEffect(
    () =>
      useGame.subscribe((s, prev) => {
        if (s.order && s.order !== prev.order)
          push(`Pesanan ${s.order.id} lunas via ${s.order.method}`, "shop");
      }),
    [push],
  );

  useEffect(() => {
    const now = new Map(roster.map((r) => [r.id, r.name]));
    for (const [id, name] of now)
      if (!prevRoster.current.has(id) && id !== playerId) push(`${name} masuk dunia`, "social");
    for (const [id, name] of prevRoster.current)
      if (!now.has(id)) push(`${name} keluar dunia`, "social");
    prevRoster.current = now;
  }, [roster, push]);

  useEffect(() => {
    const m = chat[chat.length - 1];
    if (!m || m.at <= lastChat.current) return;
    lastChat.current = m.at;
    const mine = m.from === playerId;
    push(m.text.slice(0, 80), "chat", mine ? "Kamu" : m.name);
  }, [chat, push]);
}

const DOT: Record<FeedTone, string> = {
  ops: "bg-world-accent",
  social: "bg-world-sky",
  shop: "bg-world-online",
  system: "bg-world-muted",
  chat: "bg-world-brand",
};

const LIFETIME_CHAT = 9000;
const LIFETIME = 6000;

/** Sheet yang menutupi kiri atas — feed disembunyikan. Chat tetap tampil di kiri. */
function hidesFeed(sheet: ReturnType<typeof useHud.getState>["sheet"]) {
  return sheet === "map" || sheet === "profile" || sheet === "explore" || sheet === "help" || sheet === "feed";
}

/** Feed kejadian + bubble chat di kiri, gaya activity realtime. */
export function EventFeed({ compact }: { compact: boolean }) {
  const events = useHud((s) => s.events);
  const sheet = useHud((s) => s.sheet);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (hidesFeed(sheet)) return null;

  const live = events
    .filter((e) => Date.now() - e.at < (e.tone === "chat" ? LIFETIME_CHAT : LIFETIME))
    .slice(0, compact ? 2 : 4);
  if (!live.length) return null;

  return (
    <ul
      className={`pointer-events-none absolute left-[max(0.75rem,env(safe-area-inset-left))] z-[21] space-y-1.5 ${
        compact
          ? "top-[calc(env(safe-area-inset-top)+4.75rem)] max-w-[min(18rem,72vw)]"
          : "top-24 w-80 max-w-[min(20rem,calc(100vw-12rem))]"
      }`}
    >
      {live.map((e) =>
        e.tone === "chat" ? (
          <li
            key={e.id}
            className="flex items-start gap-2.5 rounded-2xl py-2 pr-3 pl-2 text-left hud-glass animate-in fade-in slide-in-from-left-2"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-world-brand text-world-brand-foreground">
              <MessageCircle className="size-4" />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block truncate font-semibold text-xs leading-tight">
                {e.title ?? "Pemain"}
              </span>
              <span className="mt-0.5 line-clamp-2 text-world-muted text-[11px] leading-snug">
                {e.text}
              </span>
            </span>
          </li>
        ) : (
          <li
            key={e.id}
            className="flex items-center gap-2 rounded-full py-1.5 pr-3 pl-2.5 text-xs hud-glass animate-in fade-in slide-in-from-left-2"
          >
            <span className={`size-2 shrink-0 rounded-full ${DOT[e.tone]}`} />
            <span className="truncate">{e.text}</span>
          </li>
        ),
      )}
    </ul>
  );
}
