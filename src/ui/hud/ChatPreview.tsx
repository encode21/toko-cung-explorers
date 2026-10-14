import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ChevronRight, Laugh, Send, Smile, Triangle } from "lucide-react";
import { useNet } from "@/net/net-store";
import { getActiveChannel, sendChat } from "@/net/useWorldChannel";
import { CHAT_CHANNEL_LABELS, isNearbyChatSender } from "@/net/chat-channels";
import { useHud } from "@/state/hud-store";
import { useGame } from "@/state/game-store";
import { useGamePanelLock } from "@/ui/game-ui/GamePanel";
import { CHAT_EMOTES, selectChatEmote, type ChatEmoteId } from "@/game/social/social-actions";
import "./chat-dock.css";

const QUICK_MESSAGES = [
  "Halo!",
  "Hahaha",
  "Ayo bermain bersama!",
  "Terima kasih!",
  "Tunggu aku!",
  "Sampai jumpa!",
];
type ChatTray = "quick" | "emote";

function TypingLock() {
  useGamePanelLock();
  return null;
}

function ChatGlyph() {
  return (
    <svg viewBox="0 0 28 28" aria-hidden="true">
      <path
        fill="currentColor"
        d="M5 4h18a3 3 0 0 1 3 3v13a3 3 0 0 1-3 3H12l-6 4v-4H5a3 3 0 0 1-3-3V7a3 3 0 0 1 3-3Z"
      />
      <g fill="var(--chat-icon-cutout, #36322e)">
        <circle cx="8" cy="13" r="1.7" />
        <circle cx="14" cy="13" r="1.7" />
        <circle cx="20" cy="13" r="1.7" />
      </g>
    </svg>
  );
}

/** Small silhouettes keep the pose options readable at mobile HUD size. */
function EmoteGlyph({ id }: { id: ChatEmoteId }) {
  if (id === "laugh") return <Laugh aria-hidden="true" />;
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" fill="none">
      {id === "sit" ? (
        <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="15" cy="7" r="4" fill="currentColor" stroke="none" />
          <path d="M14 14v9h10v5M18 14l3 6h5M12 23l-5 5h10" />
        </g>
      ) : id === "lie" ? (
        <g stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="6" cy="18" r="4" fill="currentColor" stroke="none" />
          <path d="m13 22 7-4 8 5M13 22h15M15 20l-2-7" />
        </g>
      ) : (
        <g stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
          <circle cx="16" cy="16" r="11" />
          <path d="m9 11 4 2m10-2-4 2m-7 9q4-5 8 0M4 4l3 2m20-2-2 3" />
          <circle cx="12" cy="16" r="1" fill="currentColor" />
          <circle cx="20" cy="16" r="1" fill="currentColor" />
        </g>
      )}
    </svg>
  );
}

/** Bottom-center composer, with quick messages and character poses in an expanding tray. */
export function ChatPreview() {
  const chat = useNet((s) => s.chat);
  const name = useNet((s) => s.name) || "Pengunjung";
  const unread = useNet((s) => s.unread);
  const open = useHud((s) => s.setSheet);
  const channel = useHud((s) => s.chatChannel);
  const channelLabel = CHAT_CHANNEL_LABELS[channel];
  const [now, setNow] = useState(Date.now);
  const text = useHud((s) => s.chatDraft);
  const setText = useHud((s) => s.setChatDraft);
  const [typing, setTyping] = useState(false);
  const [tray, setTray] = useState<ChatTray | null>(null);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const dockRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const quickRef = useRef<HTMLButtonElement>(null);
  const emoteRef = useRef<HTMLButtonElement>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const trayId = useId();

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

  useEffect(() => {
    if (!tray && !typing) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !dockRef.current?.contains(event.target)) {
        setTray(null);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [tray, typing]);

  useEffect(() => {
    optionsRef.current?.scrollTo({ left: 0 });
    optionsRef.current?.querySelector<HTMLButtonElement>("button")?.focus({ preventScroll: true });
  }, [tray]);

  const latest = chat
    .filter(
      (message) =>
        now - message.at < 10_000 && (channel === "world" || isNearbyChatSender(message.from)),
    )
    .at(-1);
  const showLatest = latest && !typing && !text;
  const closeTray = () => {
    (tray === "quick" ? quickRef : emoteRef).current?.focus({ preventScroll: true });
    setTray(null);
  };
  const toggleTray = (next: ChatTray) => {
    inputRef.current?.blur();
    setTray((current) => (current === next ? null : next));
  };
  const send = async (value: string, fromInput: boolean) => {
    if (!value.trim() || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const result = await sendChat(getActiveChannel(), name, value);
      if (!result.ok) {
        useGame.getState().setToast(result.error);
        return;
      }
      if (fromInput) {
        if (useHud.getState().chatDraft === value) setText("");
        inputRef.current?.blur();
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void send(text, true);
  };
  const emote = (id: ChatEmoteId) => {
    const result = selectChatEmote(id);
    useGame.getState().setToast(result.message);
    // Removing the focused option returns keyboard control to the world (including Space to jump).
    if (result.ok) setTray(null);
  };

  return (
    <div
      ref={dockRef}
      className="mmo-chat-dock"
      data-chat-dock
      data-hud-control
      data-expanded={tray !== null}
      data-typing={typing}
      onKeyDown={(event) => {
        // Space activates HUD buttons without jumping; movement still works after a pose selection.
        if (
          event.target instanceof HTMLInputElement ||
          [" ", "Enter", "Escape"].includes(event.key) ||
          (tray && event.key.startsWith("Arrow"))
        )
          event.stopPropagation();
        if (event.key !== "Escape") return;
        event.preventDefault();
        if (tray) closeTray();
        else inputRef.current?.blur();
      }}
    >
      {typing && <TypingLock />}
      <button
        ref={quickRef}
        type="button"
        aria-label="Quick chat"
        title="Quick chat"
        aria-expanded={tray === "quick"}
        aria-controls={tray === "quick" ? trayId : undefined}
        data-chat-quick-toggle
        className="mmo-chat-round mmo-chat-quick-toggle"
        onClick={() => toggleTray("quick")}
      >
        <ChatGlyph />
      </button>

      <form
        className="mmo-chat-capsule"
        onSubmit={submit}
        aria-label={`Chat ${channelLabel.toLowerCase()}`}
      >
        <span className="mmo-chat-channel" title={`Chat ${channelLabel}`}>
          {channelLabel}
        </span>
        <div className="mmo-chat-entry">
          <input
            ref={inputRef}
            data-chat-input
            aria-label="Pesan chat"
            value={text}
            placeholder={showLatest ? "" : "Ketik pesan…"}
            maxLength={200}
            autoComplete="off"
            enterKeyHint="send"
            readOnly={sending}
            onChange={(event) => setText(event.target.value)}
            onFocus={() => {
              setTyping(true);
              setTray(null);
            }}
            onBlur={() => setTyping(false)}
          />
          {showLatest && (
            <span
              className="mmo-chat-latest"
              data-chat-latest
              title={new Date(latest.at).toLocaleTimeString("id-ID", {
                hour: "2-digit",
                minute: "2-digit",
                timeZone: "Asia/Jakarta",
              })}
            >
              <strong>{latest.name}</strong> : {latest.text}
            </span>
          )}
        </div>
        {text.trim() ? (
          <button
            type="submit"
            className="mmo-chat-capsule-action"
            aria-label="Kirim pesan"
            title="Kirim pesan"
            disabled={sending}
          >
            <Send aria-hidden="true" />
          </button>
        ) : (
          <button
            type="button"
            className="mmo-chat-capsule-action"
            data-chat-preview
            aria-label="Buka riwayat chat"
            title="Buka riwayat chat"
            onClick={() => open("chat")}
          >
            <Triangle fill="currentColor" aria-hidden="true" />
            {unread > 0 && <span className="mmo-chat-unread">{unread > 99 ? "99+" : unread}</span>}
          </button>
        )}
      </form>

      <button
        ref={emoteRef}
        type="button"
        aria-label="Emote"
        title="Emote karakter"
        aria-expanded={tray === "emote"}
        aria-controls={tray === "emote" ? trayId : undefined}
        data-chat-emote-toggle
        className="mmo-chat-round mmo-chat-emote-toggle"
        onClick={() => toggleTray("emote")}
      >
        <Smile aria-hidden="true" />
      </button>

      {tray && (
        <div
          id={trayId}
          data-chat-tray={tray}
          className="mmo-chat-tray"
          role="group"
          aria-label={tray === "quick" ? "Pilihan quick chat" : "Pose karakter"}
        >
          <div ref={optionsRef} className="mmo-chat-options">
            {tray === "quick"
              ? QUICK_MESSAGES.map((message) => (
                  <button
                    key={message}
                    type="button"
                    className="mmo-chat-phrase"
                    disabled={sending}
                    onClick={() => void send(message, false)}
                  >
                    {message}
                  </button>
                ))
              : CHAT_EMOTES.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    className="mmo-chat-pose"
                    aria-label={item.label}
                    onClick={() => emote(item.id)}
                  >
                    <span className="mmo-chat-pose-art">
                      <EmoteGlyph id={item.id} />
                    </span>
                  </button>
                ))}
          </div>
          <div className="mmo-chat-tray-tools">
            <button
              type="button"
              aria-label="Pilihan berikutnya"
              className="mmo-chat-next"
              onClick={() => {
                const element = optionsRef.current;
                if (!element) return;
                const atEnd = element.scrollLeft + element.clientWidth >= element.scrollWidth - 4;
                element.scrollTo({
                  left: atEnd ? 0 : element.scrollLeft + element.clientWidth * 0.8,
                });
              }}
            >
              <ChevronRight aria-hidden="true" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
