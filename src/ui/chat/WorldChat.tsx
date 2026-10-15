import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { ChevronRight, Globe2, MessageCircle, Send } from "lucide-react";
import { useNet } from "@/net/net-store";
import { getActiveChannel, playerId, sendChat, useWorldChannel } from "@/net/useWorldChannel";
import { CHAT_CHANNEL_LABELS, isNearbyChatSender } from "@/net/chat-channels";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useProfile } from "@/identity/profile-store";
import type { AvatarConfig } from "@/identity/avatar";
import { AvatarPortrait } from "@/ui/profile/AvatarPortrait";

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
  { id: "nearby", label: CHAT_CHANNEL_LABELS.nearby },
  { id: "world", label: CHAT_CHANNEL_LABELS.world },
  { id: "private", label: "Pemain" },
  { id: "system", label: "Sistem" },
];
const time = (at: number) =>
  new Date(at).toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });

function ChatAvatar({
  name,
  avatar,
  character,
}: {
  name: string;
  avatar: AvatarConfig | undefined;
  character: string | null | undefined;
}) {
  return (
    <div className="game-chat-avatar" aria-hidden="true">
      {avatar ? (
        <AvatarPortrait avatar={avatar} character={character ?? null} size="sm" />
      ) : (
        <span>{name.slice(0, 1).toUpperCase()}</span>
      )}
    </div>
  );
}

/** Drawer chat sosial dengan tab di atas dan composer tetap di bawah. */
export function ChatPanel() {
  const name = useNet((s) => s.name) || "Pengunjung";
  const chat = useNet((s) => s.chat);
  const roster = useNet((s) => s.roster);
  const profile = useProfile((s) => s.profile);
  const events = useHud((s) => s.events);
  const [tab, setTab] = useState<Tab>(() => useHud.getState().chatChannel);
  const setChannel = useHud((s) => s.setChatChannel);
  const text = useHud((s) => s.chatDraft);
  const setText = useHud((s) => s.setChatDraft);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const listRef = useRef<HTMLDivElement>(null);
  const followLatest = useRef(true);
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const id = useId();

  const list =
    tab === "nearby" ? chat.filter((m) => isNearbyChatSender(m.from)) : tab === "world" ? chat : [];

  const lastMessageId = list.at(-1)?.id;
  useEffect(() => {
    if (followLatest.current) listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [list.length, lastMessageId, tab, events.length]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value || sendingRef.current) return;
    sendingRef.current = true;
    setSending(true);
    try {
      const result = await sendChat(getActiveChannel(), name, value);
      if (result.ok) {
        followLatest.current = true;
        if (useHud.getState().chatDraft === text) setText("");
      } else {
        useGame.getState().setToast(result.error);
      }
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  };

  const canSend = tab === "nearby" || tab === "world";
  const others = roster.filter((p) => p.id !== playerId);
  const selectTab = (value: Tab) => {
    followLatest.current = true;
    setTab(value);
    if (value === "nearby" || value === "world") setChannel(value);
  };
  const navigateTabs = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    let next = index;
    if (event.key === "ArrowRight") next = (index + 1) % TABS.length;
    else if (event.key === "ArrowLeft") next = (index + TABS.length - 1) % TABS.length;
    else if (event.key === "Home") next = 0;
    else if (event.key === "End") next = TABS.length - 1;
    else return;
    event.preventDefault();
    const target = TABS[next];
    if (target) selectTab(target.id);
    tabRefs.current[next]?.focus();
  };
  const channelHint =
    tab === "nearby"
      ? "Pesan dari pemain di sekitarmu"
      : tab === "world"
        ? "Mengobrol bersama pemain di dunia ini"
        : tab === "private"
          ? "Ketuk pemain untuk melihat profil"
          : "Kabar dan aktivitas dari dunia";

  return (
    <div className="game-chat">
      <div role="tablist" aria-label="Channel chat" className="game-chat-tabs">
        {TABS.map((t, index) => (
          <button
            key={t.id}
            ref={(element) => {
              tabRefs.current[index] = element;
            }}
            type="button"
            role="tab"
            id={`${id}-tab-${t.id}`}
            aria-controls={`${id}-panel-${t.id}`}
            aria-selected={tab === t.id}
            tabIndex={tab === t.id ? 0 : -1}
            onClick={() => selectTab(t.id)}
            onKeyDown={(event) => navigateTabs(event, index)}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="game-chat-channel">
        <MessageCircle aria-hidden="true" />
        {channelHint}
      </p>
      {TABS.map((t) => (
        <div
          key={t.id}
          role="tabpanel"
          id={`${id}-panel-${t.id}`}
          aria-labelledby={`${id}-tab-${t.id}`}
          hidden={tab !== t.id}
          className="game-chat-tabpanel"
        >
          {tab === t.id && (
            <div
              ref={listRef}
              tabIndex={0}
              aria-label="Riwayat chat"
              onScroll={(event) => {
                const el = event.currentTarget;
                followLatest.current = el.scrollHeight - el.scrollTop - el.clientHeight < 24;
              }}
              className="game-chat-messages"
            >
              {tab === "private" &&
                (others.length === 0 ? (
                  <p className="game-chat-empty">Belum ada pemain lain di ruangan ini.</p>
                ) : (
                  <div className="game-chat-players">
                    {others.map((p) => (
                      <button
                        type="button"
                        onClick={() => useHud.setState({ selectedPlayer: p.id })}
                        key={p.id}
                        className="game-chat-player"
                      >
                        <ChatAvatar name={p.name} avatar={p.avatar} character={p.character} />
                        <span className="game-chat-player-name">{p.name}</span>
                        <ChevronRight aria-hidden="true" />
                      </button>
                    ))}
                  </div>
                ))}

              {tab === "system" &&
                (events.length === 0 ? (
                  <p className="game-chat-empty">Belum ada kabar dari dunia.</p>
                ) : (
                  events.map((e) => (
                    <p key={e.id} className="game-chat-system">
                      <time dateTime={new Date(e.at).toISOString()}>{time(e.at)}</time>
                      <span>{e.text}</span>
                    </p>
                  ))
                ))}

              {canSend && list.length === 0 && (
                <p className="game-chat-empty">
                  {tab === "nearby"
                    ? "Belum ada obrolan di sekitarmu."
                    : "Belum ada pesan. Sapa pemain lain di Toko Cung."}
                </p>
              )}
              {canSend &&
                list.map((m) => {
                  const mine = m.from === playerId;
                  const sender = roster.find((p) => p.id === m.from);
                  return (
                    <div key={m.id} className="game-chat-line" data-mine={mine}>
                      <ChatAvatar
                        name={m.name}
                        avatar={mine ? profile?.avatar : sender?.avatar}
                        character={mine ? profile?.equippedCharacter : sender?.character}
                      />
                      <div className="game-chat-message">
                        <div className="game-chat-sender">
                          <span>{mine ? "Kamu" : m.name}</span>
                          <time dateTime={new Date(m.at).toISOString()}>{time(m.at)}</time>
                        </div>
                        <p className="game-chat-bubble">{m.text}</p>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      ))}

      {canSend && (
        <form onSubmit={submit} className="game-chat-composer">
          <div className="game-chat-input">
            <Globe2 aria-hidden="true" />
            <input
              aria-label="Pesan chat"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder={tab === "nearby" ? "Chat sekitar…" : "Chat dunia…"}
              maxLength={200}
              readOnly={sending}
            />
          </div>
          <button type="submit" aria-label="Kirim" disabled={!text.trim() || sending}>
            <Send aria-hidden="true" />
            <span>Kirim</span>
          </button>
        </form>
      )}
    </div>
  );
}
