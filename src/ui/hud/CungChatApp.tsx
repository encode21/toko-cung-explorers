import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, Search } from "lucide-react";
import { staffCommand, useStaff } from "@/game/staff/store";
import { loadContacts, useWarung, warungCommand } from "@/game/warung/store";
import {
  rupiah,
  type NpcContact,
  type WarungDebt,
  type WarungDebtHistory,
} from "@/game/warung/model";
import { NpcContactView } from "./NpcContactView";
import { DebtChat } from "./WarungPanel";
import { RentCard } from "./WarungLifeCards";
import { WarungDebtThread } from "./WarungDebtHistory";
import { CungChatDashboard } from "./CungChatDashboard";
import "./warung-panel.css";
import "./cung-chat-app.css";

type Conversation =
  | { kind: "rent"; id: string; name: string; preview: string; status: string; at?: string }
  | {
      kind: "debt";
      id: string;
      name: string;
      preview: string;
      status: string;
      at?: string;
      debt: WarungDebt;
    }
  | {
      kind: "history";
      id: string;
      name: string;
      preview: string;
      status: string;
      at?: string;
      debt: WarungDebtHistory;
    }
  | { kind: "staff"; id: string; name: string; preview: string; status: string; at?: string }
  | {
      kind: "npc";
      id: string;
      name: string;
      preview: string;
      status: string;
      at?: string;
      contact: NpcContact;
    };

const dateLabel = (iso?: string) =>
  iso && Number.isFinite(Date.parse(iso))
    ? new Date(iso).toLocaleDateString("id-ID", {
        day: "numeric",
        month: "short",
        timeZone: "Asia/Jakarta",
      })
    : "";
const initials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

function ContactAvatar({ name, kind }: { name: string; kind: Conversation["kind"] }) {
  return (
    <span className="cung-chat-avatar" data-kind={kind} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

/** Inbox and separate conversation views use the existing rent/debt/staff actions. */
export function CungChatApp() {
  const data = useWarung((s) => s.data);
  const error = useWarung((s) => s.error);
  const staff = useStaff((s) => s.data);
  const contacts = useWarung((s) => s.contacts);
  const [open, setOpen] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [dashboardExpanded, setDashboardExpanded] = useState(false);
  const returnTo = useRef<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const inbox = useRef<HTMLDivElement>(null);
  const inboxScroll = useRef(0);
  useEffect(() => {
    if (!useWarung.getState().data) void warungCommand("read");
    void staffCommand("state");
    void loadContacts();
  }, []);
  useLayoutEffect(() => {
    if (open) back.current?.focus();
    else if (returnTo.current) {
      if (inbox.current) inbox.current.scrollTop = inboxScroll.current;
      if (returnTo.current === "dashboard-bill") {
        root.current?.querySelector<HTMLButtonElement>("[data-chat-open-bill]")?.focus();
        return;
      }
      const trigger = [
        ...(root.current?.querySelectorAll<HTMLButtonElement>("[data-conversation]") ?? []),
      ].find((button) => button.dataset["conversation"] === returnTo.current);
      (trigger ?? root.current?.querySelector<HTMLInputElement>("input[type=search]"))?.focus({
        preventScroll: true,
      });
    }
  }, [open]);

  if (!data)
    return (
      <div className="cung-chat-empty" role={error ? "alert" : "status"}>
        <p>{error || "Memuat percakapan…"}</p>
        {error && (
          <button type="button" onClick={() => void warungCommand("read")}>
            Coba lagi
          </button>
        )}
      </div>
    );
  if (!data.warung)
    return <p className="cung-chat-empty">Buka warung dulu di aplikasi Warungku.</p>;
  const rent = data.rent;
  const conversations: Conversation[] = [
    {
      kind: "rent",
      id: "rent",
      name: rent?.landlord ?? "Koko Cung",
      preview:
        rent && rent.owedDays > 0
          ? `${rent.text?.["due"] ?? "Tagihan belum dibayar"} · ${rupiah(rent.owed)}`
          : (rent?.text?.["paid"] ?? "Sewa lunas. Semoga laris!"),
      status: rent?.owedDays ? `${rent.owedDays} hari` : "Lunas",
    },
  ];
  for (const debt of data.debts)
    conversations.push({
      kind: "debt",
      id: `debt-${debt.id}`,
      name: debt.npc,
      debt,
      preview: `Utang ${rupiah(debt.amount)} · Ketuk untuk menagih`,
      status: "Belum lunas",
      ...(debt.lastRemindedAt ? { at: debt.lastRemindedAt } : {}),
    });
  for (const debt of data.debtHistory ?? []) {
    if (debt.status === "ACCEPTED" || data.debts.some((active) => active.id === debt.id)) continue;
    conversations.push({
      kind: "history",
      id: `history-${debt.id}`,
      name: debt.npc,
      debt,
      preview:
        debt.status === "PAID"
          ? `Utang ${rupiah(debt.amount)} sudah lunas`
          : `Utang ${rupiah(debt.amount)} tidak dibayar`,
      status: debt.status === "PAID" ? "Lunas" : "Tidak dibayar",
      at: debt.resolvedAt ?? debt.askedAt,
    });
  }
  const staffNames = new Set((staff?.messages ?? []).map((message) => message.name));
  for (const name of staffNames) {
    const latest = staff!.messages
      .filter((message) => message.name === name)
      .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))[0]!;
    conversations.push({
      kind: "staff",
      id: `staff-${name}`,
      name,
      preview: latest.text,
      status: "Karyawan",
      at: latest.at,
    });
  }
  // Kontak: regulars who shopped here, newest visit first.
  for (const contact of contacts ?? [])
    conversations.push({
      kind: "npc",
      id: `npc-${contact.id}`,
      name: contact.name,
      contact,
      preview: contact.chat ? `💬 ${contact.chat.prompt}` : contact.role,
      status: contact.chat ? "Ngobrol" : contact.role,
      ...(contact.lastAt ? { at: contact.lastAt } : {}),
    });
  const visible = conversations.filter((conversation) =>
    conversation.name.toLocaleLowerCase("id-ID").includes(search.trim().toLocaleLowerCase("id-ID")),
  );
  const current = open
    ? (conversations.find((conversation) => conversation.id === open.id) ?? open)
    : null;
  const resolvedDebt =
    current?.kind === "debt" && !data.debts.some((debt) => debt.id === current.debt.id)
      ? data.debtHistory?.find((debt) => debt.id === current.debt.id)
      : undefined;
  const currentStatus = resolvedDebt
    ? resolvedDebt.status === "PAID"
      ? "Lunas"
      : "Tidak dibayar"
    : current?.status;
  const choose = (conversation: Conversation, fromDashboard = false) => {
    inboxScroll.current = inbox.current?.scrollTop ?? 0;
    returnTo.current = fromDashboard ? "dashboard-bill" : conversation.id;
    setOpen(conversation);
  };
  return (
    <div
      ref={root}
      className="warung-panel cung-chat-app"
      data-cungchat
      data-chat-view={current ? "conversation" : "inbox"}
    >
      {current ? (
        <>
          <header className="cung-chat-contact">
            <button
              ref={back}
              type="button"
              aria-label="Kembali ke daftar chat"
              onClick={() => setOpen(null)}
            >
              <ArrowLeft aria-hidden="true" />
            </button>
            <ContactAvatar name={current.name} kind={current.kind} />
            <div>
              <strong>{current.name}</strong>
              <small>
                {current.kind === "debt" || current.kind === "history"
                  ? `${rupiah(current.debt.amount)} · ${currentStatus}`
                  : currentStatus}
              </small>
            </div>
          </header>
          <div className="cung-chat-conversation" key={current.id}>
            {current.kind === "npc" ? (
              <NpcContactView contact={current.contact} />
            ) : current.kind === "debt" ? (
              <DebtChat debt={current.debt} embedded onBack={() => setOpen(null)} />
            ) : current.kind === "history" ? (
              <WarungDebtThread debt={current.debt} />
            ) : current.kind === "rent" ? (
              rent && (rent.owedDays > 0 || rent.kind === "gang") ? (
                <RentCard embedded />
              ) : (
                <ol className="warung-chat-thread">
                  <li data-from="koko">
                    {rent?.text?.["paid"] ?? "Sewa aman, sudah lunas. Makasih ya, semoga laris!"}
                  </li>
                </ol>
              )
            ) : (
              <ol className="warung-chat-thread">
                {(staff?.messages ?? [])
                  .filter((message) => message.name === current.name)
                  .sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
                  .map((message) => (
                    <li key={message.id} data-from="staff">
                      <p>{message.text}</p>
                      <time dateTime={message.at}>
                        {new Date(message.at).toLocaleString("id-ID", {
                          timeZone: "Asia/Jakarta",
                          day: "numeric",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}{" "}
                        WIB
                      </time>
                    </li>
                  ))}
              </ol>
            )}
          </div>
        </>
      ) : (
        <div
          ref={inbox}
          className="cung-chat-inbox"
          onScroll={(event) => {
            inboxScroll.current = event.currentTarget.scrollTop;
          }}
        >
          <div className="cung-chat-dashboard">
            <CungChatDashboard
              onOpenBill={() => choose(conversations[0]!, true)}
              expanded={dashboardExpanded}
              onExpandedChange={setDashboardExpanded}
            />
          </div>
          <section className="cung-chat-sheet" aria-label="Percakapan">
            <div className="cung-chat-sheet-top">
              <span className="cung-chat-sheet-handle" aria-hidden="true" />
              <label className="cung-chat-search">
                <Search aria-hidden="true" />
                <input
                  type="search"
                  aria-label="Cari percakapan"
                  placeholder="Cari nama"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </label>
            </div>
            {[
              { label: "Percakapan", rows: visible.filter((c) => c.kind !== "npc") },
              { label: "Kontak pelanggan", rows: visible.filter((c) => c.kind === "npc") },
            ].map(
              (group, g) =>
                (g === 0 || group.rows.length > 0) && (
                  <div key={group.label}>
                    {g > 0 && <h3 className="cung-chat-list-heading">{group.label}</h3>}
                    <ul className="cung-chat-list" aria-label={group.label}>
                      {group.rows.map((conversation) => (
                        <li key={conversation.id}>
                          <button
                            type="button"
                            data-conversation={conversation.id}
                            onClick={() => choose(conversation)}
                          >
                            <ContactAvatar name={conversation.name} kind={conversation.kind} />
                            <span className="cung-chat-summary">
                              <span>
                                <strong>{conversation.name}</strong>
                                {dateLabel(conversation.at) && (
                                  <time dateTime={conversation.at}>
                                    {dateLabel(conversation.at)}
                                  </time>
                                )}
                              </span>
                              <small>{conversation.preview}</small>
                              <span
                                className="cung-chat-status"
                                data-pending={
                                  conversation.kind === "debt" ||
                                  (conversation.kind === "rent" && !!rent?.owedDays) ||
                                  undefined
                                }
                              >
                                {conversation.status}
                              </span>
                            </span>
                            <ChevronRight className="cung-chat-chevron" aria-hidden="true" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                ),
            )}
            {!visible.length && (
              <p className="cung-chat-empty" role="status">
                Tidak ada percakapan dengan nama itu.
              </p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
