import { GangWelcome, KasbonCard } from "@/game/gang/GangEconomyCards";
import { isCashMovement } from "@/game/gang/economy";
import { useStaff } from "@/game/staff/store";
import { StaffMessages } from "@/game/staff/StaffMessages";
import { useEffect, useState } from "react";
import { ensureWarungData, useWarung, warungCommand } from "@/game/warung/store";
import { rupiah, type WarungDebt } from "@/game/warung/model";
import { Catatan, DebtChat, JOURNAL_LABEL } from "./WarungPanel";
import { RentCard } from "./WarungLifeCards";
import { WarungDebtHistory } from "./WarungDebtHistory";
import "./warung-panel.css";
import { PrologNotes } from "@/game/prolog/PrologUI";
import { StoryBook } from "./StoryBook";

function useWarungData() {
  useEffect(() => void ensureWarungData(), []);
  return useWarung((s) => s.data);
}

function NoWarung() {
  return <p className="warung-hint">Buka warung dulu di aplikasi Warungku.</p>;
}

/** CungChat: Koko Cung (sewa) and every customer who owes you, as chats you can answer. */
export function CungChatApp() {
  const data = useWarungData();
  const [open, setOpen] = useState<"koko" | WarungDebt | null>(null);
  if (!data?.warung) return <NoWarung />;
  const rent = data.rent;
  const resolved = (data.debtHistory ?? []).filter((d) => d.status !== "ACCEPTED");
  return (
    <div className="warung-panel" data-cungchat>
      <div className="warung-panel-body">
        {open === "koko" ? (
          <div className="warung-list">
            <button type="button" className="warung-secondary" onClick={() => setOpen(null)}>
              ← Semua chat
            </button>
            {rent && rent.owedDays > 0 ? (
              <RentCard />
            ) : (
              <ol className="warung-chat-thread">
                <li data-from="koko">
                  {rent?.text?.["paid"] ?? "Sewa aman, sudah lunas. Makasih ya, semoga laris 🙏"}
                </li>
              </ol>
            )}
          </div>
        ) : open ? (
          <DebtChat debt={open} onBack={() => setOpen(null)} />
        ) : (
          <div className="warung-list">
            <GangWelcome />
            <KasbonCard />
            <ul className="warung-chat-list">
              <li>
                <button type="button" onClick={() => setOpen("koko")}>
                  <span className="warung-chat-avatar">🧧</span>
                  <span>
                    <strong>{rent?.landlord ?? "Koko Cung"}</strong>
                    <small>
                      {rent && rent.owedDays > 0
                        ? `${rent.text?.["due"] ?? "Sewa nunggak"} · ${rent.owedDays} hari · ${rupiah(rent.owed)}`
                        : (rent?.text?.["paid"] ?? "Sewa lunas")}
                    </small>
                  </span>
                  {rent && rent.owedDays > 0 && (
                    <b className="warung-chat-badge">{rent.owedDays}</b>
                  )}
                </button>
              </li>
              {data.debts.map((d) => (
                <li key={d.id}>
                  <button type="button" onClick={() => setOpen(d)}>
                    <span className="warung-chat-avatar">💸</span>
                    <span>
                      <strong>{d.npc}</strong>
                      <small>Utang {rupiah(d.amount)} · ketuk untuk menagih</small>
                    </span>
                    <b className="warung-chat-badge">!</b>
                  </button>
                </li>
              ))}
            </ul>
            <StaffMessages />
            <WarungDebtHistory debts={resolved} />
          </div>
        )}
      </div>
    </div>
  );
}

/** Notes: Buku Mbah is available before opening a warung; the cash journal remains below it. */
export function NotesApp() {
  const data = useWarungData();
  return (
    <div className="warung-panel" data-notes>
      <div className="warung-panel-body">
        <PrologNotes />
        <StoryBook />
        {data?.warung && <Catatan />}
      </div>
    </div>
  );
}

/** CngBank: saldo Kas usaha, mutasi masuk/keluar, and paying Koko Cung's rent from the bank. */
export function CngBankApp() {
  const staffText = useStaff((s) => s.data?.text);
  const data = useWarungData();
  const busy = useWarung((s) => s.busy);
  if (!data?.warung) return <NoWarung />;
  const w = data.warung;
  const totalIn = data.journal
    .filter((j) => isCashMovement(j) && j.amount > 0)
    .reduce((a, j) => a + j.amount, 0);
  const totalOut = data.journal
    .filter((j) => isCashMovement(j) && j.amount < 0)
    .reduce((a, j) => a - j.amount, 0);
  const rent = data.rent;
  return (
    <div className="warung-panel" data-cngbank>
      <div className="warung-panel-body">
        <div className="warung-list">
          <section className="warung-card cngbank-card">
            <small>Saldo Kas usaha · {w.name}</small>
            <strong>{rupiah(w.cash)}</strong>
            <div className="warung-ledger-summary">
              <span>
                Masuk <b className="pos">+{rupiah(totalIn)}</b>
              </span>
              <span>
                Keluar <b className="neg">−{rupiah(totalOut)}</b>
              </span>
            </div>
          </section>
          {rent && rent.owedDays > 0 && (
            <section className="warung-card">
              <div className="warung-card-head">
                <strong>{rent.text?.["title"] ?? "🧧 Tagihan sewa Koko Cung"}</strong>
                <span className="warung-level-pill">{rent.owedDays} hari</span>
              </div>
              <button
                type="button"
                className="warung-cta"
                disabled={busy || w.cash < rent.daily}
                onClick={() => void warungCommand("pay_rent")}
              >
                {rent.text?.["pay"] ?? "Transfer sewa"}{" "}
                {rupiah(Math.min(rent.owed, Math.floor(w.cash / rent.daily) * rent.daily))}
              </button>
              <p className="warung-hint">Dibayar per hari penuh sebanyak saldo cukup.</p>
            </section>
          )}
          <KasbonCard />
          <section className="warung-journal" aria-label="Mutasi Kas">
            <div className="warung-journal-head">
              <h4>Mutasi terakhir</h4>
            </div>
            <ul>
              {data.journal.map((j, i) => (
                <li key={i}>
                  <span>
                    {(j.type.startsWith("STAFF_")
                      ? staffText?.[`journal_${j.type.slice(6).toLowerCase()}`]
                      : null) ??
                      j.label ??
                      JOURNAL_LABEL[j.type] ??
                      j.type}
                  </span>
                  <b data-negative={j.amount < 0 || undefined}>
                    {isCashMovement(j) ? (j.amount < 0 ? "−" : "+") : ""}
                    {rupiah(Math.abs(j.amount))}
                    {!isCashMovement(j) && <small>{rent?.text?.["non_cash"]}</small>}
                  </b>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
