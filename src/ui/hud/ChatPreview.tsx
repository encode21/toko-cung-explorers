import { MessageCircle } from "lucide-react";
import { useNet } from "@/net/net-store";
import { useHud } from "@/state/hud-store";

/** Persistent chat entry sits above the dock, outside the movement touch zone. */
export function ChatPreview() {
  const latest = useNet((s) => s.chat.at(-1));
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
      <span className="min-w-0 truncate text-left">
        {latest ? (
          <>
            <strong>{latest.name}</strong>
            <span className="ml-1.5">{latest.text}</span>
          </>
        ) : (
          "Chat · Ketuk untuk mengobrol"
        )}
      </span>
      {unread > 0 && (
        <span className="ml-auto shrink-0 rounded-full bg-world-brand px-1.5 text-[10px]">
          {unread > 99 ? "99+" : unread}
        </span>
      )}
    </button>
  );
}
