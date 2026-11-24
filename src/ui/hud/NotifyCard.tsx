import { useEffect, useMemo, useRef, useState } from "react";
import { useWarung } from "@/game/warung/store";
import { useStaff } from "@/game/staff/store";
import { useOjek } from "@/game/ojek/store";
import { rupiah } from "@/game/warung/model";
import { playWarungSfx } from "@/game/audio/sfx";
import { useHud } from "@/state/hud-store";
import { billKey, visibleCards, type Dismissed, type NotifyChat } from "./notify-model";
import "./notify-card.css";

const STORE = "world.notify.dismissed";

function load(): Dismissed {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE) ?? "null") as Dismissed | null;
    if (raw && typeof raw.chats === "object") return raw;
  } catch {
    /* storage unavailable or corrupt */
  }
  return { chats: {} };
}

/** Dismissable bill / chat reminders, stacked under the ojek offer card. */
export function NotifyCard() {
  const sheet = useHud((s) => s.sheet);
  const setSheet = useHud((s) => s.setSheet);
  const rent = useWarung((s) => s.data?.rent);
  const debts = useWarung((s) => s.data?.debts);
  const staff = useStaff((s) => s.data?.messages);
  const ojek = useOjek((s) => !!s.data?.ojek.offer);
  const [dismissed, setDismissed] = useState(load);
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);
  const chats = useMemo(() => {
    const out: NotifyChat[] = [];
    for (const m of staff ?? [])
      out.push({ id: `staff-${m.name}`, name: m.name, preview: m.text, at: Date.parse(m.at) });
    for (const d of debts ?? [])
      if (d.lastRemindedAt)
        out.push({
          id: `debt-${d.id}`,
          name: d.npc,
          preview: `Utang ${rupiah(d.amount)} · Ketuk untuk menagih`,
          at: Date.parse(d.lastRemindedAt),
        });
    return out.filter((c) => Number.isFinite(c.at));
  }, [staff, debts]);
  const bill = rent && rent.owedDays > 0 ? { amount: rent.owed, owedDays: rent.owedDays } : null;
  const cards = visibleCards({ bill, chats, dismissed, now, sheet });
  const keys = cards.map((c) => c.key + (c.kind === "chat" ? c.chat.at : billKey(c.bill))).join();
  const heard = useRef("");
  useEffect(() => {
    if (keys && keys !== heard.current) playWarungSfx("visitor");
    heard.current = keys;
  }, [keys]);

  const dismiss = (card: (typeof cards)[number]) => {
    const next: Dismissed =
      card.kind === "bill"
        ? { ...dismissed, bill: { key: billKey(card.bill), at: Date.now() } }
        : { ...dismissed, chats: { ...dismissed.chats, [card.chat.id]: card.chat.at } };
    setDismissed(next);
    try {
      localStorage.setItem(STORE, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  const touchY = useRef(0);
  if (!cards.length) return null;
  return (
    <div className="notify-stack" data-ojek={ojek || undefined}>
      {cards.map((card) => {
        const bill = card.kind === "bill";
        return (
          <section
            key={card.key}
            className="notify-card"
            data-hud-control
            role="status"
            aria-label={bill ? "Tagihan" : "Pesan baru"}
            onTouchStart={(e) => (touchY.current = e.touches[0]?.clientY ?? 0)}
            onTouchEnd={(e) => {
              if (touchY.current - (e.changedTouches[0]?.clientY ?? 0) > 40) dismiss(card);
            }}
          >
            <div className="notify-heading">
              <strong>
                {card.kind === "bill" ? (
                  "🧾 Tagihan listrik & iuran"
                ) : (
                  <>
                    <span className="notify-avatar" aria-hidden="true">
                      {card.chat.name.charAt(0).toUpperCase()}
                    </span>{" "}
                    {card.chat.name}
                  </>
                )}
              </strong>
              <button
                type="button"
                className="notify-x"
                aria-label="Tutup"
                onClick={() => dismiss(card)}
              >
                ✕
              </button>
            </div>
            {card.kind === "bill" ? (
              <p className="notify-text">
                <b>{rupiah(card.bill.amount)}</b> ·{" "}
                {card.bill.owedDays > 1
                  ? `Telat ${card.bill.owedDays} hari`
                  : "Jatuh tempo hari ini"}
              </p>
            ) : (
              <p className="notify-preview">{card.chat.preview}</p>
            )}
            <div className="notify-actions">
              <button type="button" className="notify-soft" onClick={() => dismiss(card)}>
                {bill ? "Nanti" : "Tutup"}
              </button>
              <button
                type="button"
                onClick={() => {
                  dismiss(card);
                  setSheet(bill ? "cngbank" : "cungchat");
                }}
              >
                {bill ? "Bayar" : "Buka"}
              </button>
            </div>
          </section>
        );
      })}
    </div>
  );
}
