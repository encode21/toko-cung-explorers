import { useReactiveWorld } from "@/game/reactive-world/store";
import { useEffect, useRef, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useOps } from "@/state/ops-store";
import { useNet } from "@/net/net-store";
import { useGame } from "@/state/game-store";
import { useHud, type FeedTone } from "@/state/hud-store";
import { playerId } from "@/net/useWorldChannel";

const worldFeedSeen = new Set<string>();
const eventNames = {
  STORE_RUSH: "Toko sedang ramai",
  WAREHOUSE_RUSH: "Aktivitas gudang meningkat",
  COURIER_PICKUP: "Pickup kurir dijadwalkan",
};

/** Menyalurkan kejadian dunia (ops, pemain, belanja, chat) ke feed HUD kiri. */
export function useFeedSources() {
  const push = useHud((s) => s.pushEvent);
  const roster = useNet((s) => s.roster);
  const chat = useNet((s) => s.chat);
  const prevRoster = useRef<Map<string, string>>(new Map());
  const lastChat = useRef(0);
  useEffect(() => {
    let previous = useReactiveWorld.getState().events;
    const report = () => {
      const events = useReactiveWorld.getState().events;
      const fresh = events.filter((e) => !worldFeedSeen.has(`${e.id}:active`));
      if (fresh.length) push(fresh.map((e) => eventNames[e.type]).join(" · "), "ops");
      for (const event of fresh) worldFeedSeen.add(`${event.id}:active`);
      const ended = previous.filter(
        (e) => !events.some((next) => next.id === e.id) && !worldFeedSeen.has(`${e.id}:ended`),
      );
      if (ended.length)
        push(`${ended.map((e) => eventNames[e.type]).join(" · ")} — selesai`, "ops");
      for (const event of ended) worldFeedSeen.add(`${event.id}:ended`);
      previous = events;
    };
    report();
    return useReactiveWorld.subscribe(report);
  }, [push]);

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

const PRIORITY: Record<FeedTone, number> = {
  system: 0,
  shop: 1,
  ops: 2,
  social: 3,
  chat: 4,
};

const LIFETIME_CHAT = 7000;
const LIFETIME = 4500;

/** Sheet yang menutupi kiri atas — feed disembunyikan. Chat tetap tampil di kiri. */
function hidesFeed(sheet: ReturnType<typeof useHud.getState>["sheet"]) {
  return (
    sheet === "map" ||
    sheet === "profile" ||
    sheet === "explore" ||
    sheet === "help" ||
    sheet === "feed"
  );
}

/** Feed kejadian + bubble chat di kiri, gaya activity realtime. */
export function EventFeed({ compact, embedded = false }: { compact: boolean; embedded?: boolean }) {
  const events = useHud((s) => s.events);
  const sheet = useHud((s) => s.sheet);
  const [, tick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => tick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  if (hidesFeed(sheet)) return null;

  const limit = compact ? 1 : 3;
  const live = events
    .filter((e) => Date.now() - e.at < (e.tone === "chat" ? LIFETIME_CHAT : LIFETIME))
    .sort((a, b) => PRIORITY[a.tone] - PRIORITY[b.tone] || b.at - a.at)
    .slice(0, limit);
  if (!live.length) return null;

  return (
    <ul
      className={`pointer-events-none relative z-0 space-y-1 ${
        embedded
          ? "max-w-full"
          : compact
            ? "absolute left-[max(0.75rem,env(safe-area-inset-left))] top-[calc(env(safe-area-inset-top)+4.75rem)] max-w-[min(16rem,68vw)]"
            : "absolute left-[max(0.75rem,env(safe-area-inset-left))] top-24 w-80 max-w-[min(20rem,calc(100vw-12rem))]"
      }`}
    >
      {live.map((e, i) =>
        e.tone === "chat" ? (
          <li
            key={e.id}
            style={{ opacity: 1 - i * 0.12 }}
            className={`flex items-start gap-2 text-left hud-glass animate-in fade-in slide-in-from-left-2 ${
              compact ? "rounded-xl py-1.5 pr-2.5 pl-1.5" : "rounded-2xl py-2 pr-3 pl-2 gap-2.5"
            }`}
          >
            <span
              className={`grid shrink-0 place-items-center rounded-xl bg-world-brand text-world-brand-foreground ${
                compact ? "size-7" : "size-8"
              }`}
            >
              <MessageCircle className={compact ? "size-3.5" : "size-4"} />
            </span>
            <span className="min-w-0 pt-0.5">
              <span className="block truncate font-semibold text-xs leading-tight">
                {e.title ?? "Pemain"}
              </span>
              <span
                className={`mt-0.5 line-clamp-2 text-world-muted leading-snug ${
                  compact ? "text-[10px]" : "text-[11px]"
                }`}
              >
                {e.text}
              </span>
            </span>
          </li>
        ) : (
          <li
            key={e.id}
            style={{ opacity: 1 - i * 0.15 }}
            className={`flex items-center gap-2 rounded-full hud-glass animate-in fade-in slide-in-from-left-2 ${
              compact ? "py-1 pr-2 pl-1.5 text-[10px] leading-tight" : "py-1.5 pr-3 pl-2.5 text-xs"
            }`}
          >
            <span className={`size-2 shrink-0 rounded-full ${DOT[e.tone]}`} />
            <span className="truncate">{e.text}</span>
          </li>
        ),
      )}
    </ul>
  );
}
