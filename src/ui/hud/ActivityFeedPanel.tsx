import { useId, useState, type ReactNode } from "react";
import { Bell, ChevronRight, History, Mail, MailOpen } from "lucide-react";
import { useDungeon } from "@/game/dungeon/store";
import { rupiah } from "@/game/warung/model";
import { openWarungPanel, useWarung } from "@/game/warung/store";
import { inboxText, noticeLine } from "@/game/warung/notices";
import { useHud, type FeedTab } from "@/state/hud-store";
import { usePhoneNotices } from "./use-phone-notices";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { PhoneAppArtwork } from "./PhoneAppArtwork";
import "./feed-panel.css";

function InboxRow({
  icon,
  title,
  children,
  action,
  onOpen,
  disabled,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
  action?: string;
  onOpen: () => void;
  disabled: boolean;
}) {
  const content = (
    <>
      <span className="inbox-icon" aria-hidden="true">
        {icon}
      </span>
      <span className="inbox-message">
        <strong className="inbox-title">{title}</strong>
        {children}
      </span>
    </>
  );
  if (action) {
    return (
      <li className="inbox-row inbox-bill-row">
        {content}
        <button type="button" className="inbox-action" disabled={disabled} onClick={onOpen}>
          {action}
        </button>
      </li>
    );
  }
  return (
    <li className="inbox-row">
      <button type="button" className="inbox-row-open" disabled={disabled} onClick={onOpen}>
        {content}
        <ChevronRight className="inbox-chevron" aria-hidden="true" />
      </button>
    </li>
  );
}

const feedTabs = [
  { id: "inbox", label: "Kotak Masuk", Icon: Mail },
  { id: "activity", label: "Aktivitas", Icon: History },
] as const;

export function ActivityFeedPanel({
  onCloseAutoFocus,
}: {
  onCloseAutoFocus: (event: Event, opener: FeedTab) => void;
}) {
  const tab = useHud((s) => s.feedTab);
  const [opener] = useState(tab);
  const openFeed = useHud((s) => s.openFeed);
  const events = useHud((s) => s.events);
  const inDungeon = useDungeon((s) => !!s.data?.instance);
  const { notices, catalog, cards, pendingCount, dismissChat, acknowledgeNotices } =
    usePhoneNotices();
  const activity = events.filter((event) => event.tone === "npc").slice(0, 20);
  const groupId = useId();
  const tabId = (id: FeedTab) => `${groupId}-${id}`;
  const tabs = (
    <div className="inbox-tabs" role="tablist" aria-label="Notifikasi handphone">
      {feedTabs.map(({ id, label, Icon }) => (
        <button
          key={id}
          id={tabId(id)}
          type="button"
          role="tab"
          aria-selected={tab === id}
          tabIndex={tab === id ? 0 : -1}
          aria-controls={tab === id ? groupId : undefined}
          onClick={() => openFeed(id)}
          onKeyDown={(e) => {
            if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
            e.preventDefault();
            e.stopPropagation();
            const next =
              e.key === "Home"
                ? "inbox"
                : e.key === "End"
                  ? "activity"
                  : tab === "inbox"
                    ? "activity"
                    : "inbox";
            openFeed(next);
            document.getElementById(tabId(next))?.focus();
          }}
        >
          <Icon aria-hidden />
          {label}
          {id === "inbox" && pendingCount > 0 && <span aria-hidden="true">{pendingCount}</span>}
        </button>
      ))}
    </div>
  );
  return (
    <GameModal
      title="Notifikasi"
      className="game-inbox-popup"
      bodyClassName="game-scroll-flush inbox-popup-body"
      headerAccessory={tabs}
      onClose={() => useHud.getState().setSheet("phone")}
      onCloseAutoFocus={(event) => onCloseAutoFocus(event, opener)}
    >
      <div className="activity-feed-panel" data-activity-feed>
        <div
          key={tab}
          id={groupId}
          role="tabpanel"
          aria-labelledby={tabId(tab)}
          className="inbox-scroll"
          tabIndex={0}
        >
          {tab === "inbox" ? (
            pendingCount > 0 ? (
              <>
                {inDungeon && (
                  <p className="inbox-location-hint">Aksi tersedia setelah kamu kembali ke kota.</p>
                )}
                <ul className="inbox-list" aria-label="Pesan masuk">
                  {notices.length > 0 && (
                    <InboxRow
                      icon={<PhoneAppArtwork kind="warung" />}
                      title="Kabar warung"
                      onOpen={() => {
                        acknowledgeNotices();
                        openWarungPanel("catatan");
                        useWarung.setState({ ledgerHighlight: true });
                      }}
                      disabled={inDungeon}
                    >
                      {notices.map((notice) => (
                        <span className="inbox-preview" key={notice.kind}>
                          {noticeLine(notice, catalog)}
                        </span>
                      ))}
                    </InboxRow>
                  )}
                  {cards.map((card) =>
                    card.kind === "bill" ? (
                      <InboxRow
                        key={card.key}
                        icon={<PhoneAppArtwork kind="cngbank" />}
                        title="Tagihan listrik & iuran RT"
                        action="Bayar"
                        onOpen={() => useHud.getState().openFromInbox({ app: "cngbank" })}
                        disabled={inDungeon}
                      >
                        <span className="inbox-preview">
                          <b>{rupiah(card.bill.amount)}</b> ·{" "}
                          {card.bill.owedDays > 1
                            ? `Telat ${card.bill.owedDays} hari`
                            : "Jatuh tempo hari ini"}
                        </span>
                      </InboxRow>
                    ) : (
                      <InboxRow
                        key={card.key}
                        icon={<PhoneAppArtwork kind="cungchat" />}
                        title={inboxText(card.chat.name) || "Pesan masuk"}
                        onOpen={() => {
                          dismissChat(card.chat);
                          useHud
                            .getState()
                            .openFromInbox({ app: "cungchat", threadId: card.chat.id });
                        }}
                        disabled={inDungeon}
                      >
                        <span className="inbox-preview">
                          {inboxText(card.chat.preview) || "Pesan baru"}
                        </span>
                      </InboxRow>
                    ),
                  )}
                </ul>
              </>
            ) : (
              <div className="inbox-empty">
                <MailOpen aria-hidden />
                <p>Kotak masuk kosong.</p>
              </div>
            )
          ) : activity.length ? (
            <ul className="inbox-list" aria-label="Daftar aktivitas dunia">
              {activity.map((event) => (
                <li key={event.id} className="inbox-activity-row">
                  <time dateTime={new Date(event.at).toISOString()}>
                    {new Date(event.at).toLocaleTimeString("id-ID", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </time>
                  <p>{event.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <div className="inbox-empty">
              <Bell aria-hidden />
              <p>Belum ada aktivitas NPC yang tercatat di sesi ini.</p>
            </div>
          )}
        </div>
      </div>
    </GameModal>
  );
}
