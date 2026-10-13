import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { useNet } from "@/net/net-store";
import { useHud } from "@/state/hud-store";

/** Persistent chat entry sits above the dock, outside the movement touch zone. */
export function ChatPreview() {
  const chat = useNet((s) => s.chat);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    setNow(Date.now());
    if (!chat.some((message) => Date.now() - message.at < 10_000)) return;
    const timer = window.setInterval(() => {
      const current = Date.now();
      setNow(current);
      if (!chat.some((message) => current - message.at < 10_000)) window.clearInterval(timer);
    }, 500);
    return () => window.clearInterval(timer);
  }, [chat]);
  const recent = chat.filter((message) => now - message.at < 10_000).slice(-3);
  const unread = useNet((s) => s.unread);
  const open = useHud((s) => s.setSheet);
  return (
    <button
      type="button"
      aria-label="Chat"
      data-hud-control
      data-chat-preview
      className="mmo-chat-preview"
      onClick={() => open("chat")}
    >
      <MessageCircle className="size-4 shrink-0 text-amber-200" aria-hidden />
      <span className="min-w-0 truncate text-left">Chat · Ketuk untuk mengobrol</span>
      {recent.length > 0 && (
        <span className="mmo-chat-history" aria-hidden>
          {recent.map((message) => (
            <span
              key={message.id}
              className="block truncate transition-opacity duration-500"
              style={{ opacity: Math.max(0, Math.min(1, (10_000 - (now - message.at)) / 1000)) }}
            >
              <time className="mr-1.5 text-slate-300" dateTime={new Date(message.at).toISOString()}>
                {new Date(message.at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                  timeZone: "Asia/Jakarta",
                })}
              </time>
              <strong className="text-amber-200">{message.name}</strong>: {message.text}
            </span>
          ))}
        </span>
      )}
      {unread > 0 && (
        <span className="ml-auto shrink-0 rounded-full bg-world-brand px-1.5 text-[10px]">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
