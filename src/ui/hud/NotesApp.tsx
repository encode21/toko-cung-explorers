import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useState } from "react";
import { ArrowLeft, ChevronDown, MapPin, MessageCircle, NotebookPen } from "lucide-react";
import { debtorSpot, rupiah, type WarungDebt } from "@/game/warung/model";
import { openNpcContact, trackDebtor, useWarung, warungCommand } from "@/game/warung/store";
import { useHud } from "@/state/hud-store";
import { formatDue } from "./GameCalendar";
import { NotesCashLedger } from "./NotesCashLedger";
import { WarungDebtThread, DEBT_STATUS_LABEL } from "./WarungDebtHistory";
import { DebtChat } from "./WarungPanel";
import "./notes-app.css";

function debtKey(debt: Pick<WarungDebt, "kind" | "id">) {
  return `${debt.kind ?? "ngutang"}:${debt.id}`;
}

export function NotesApp() {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const error = useWarung((s) => s.error);
  const [chat, setChat] = useState<WarungDebt | null>(null);
  useEffect(() => {
    if (!data && !busy && !error) void warungCommand("read");
  }, [data, busy, error]);

  if (!data || !data.warung) {
    return (
      <div className="notes-message" data-notes>
        <NotebookPen size={24} aria-hidden />
        {!data ? (
          <>
            <p role={error ? "alert" : "status"}>{error || "Memuat catatan warung…"}</p>
            {error && (
              <button type="button" disabled={busy} onClick={() => void warungCommand("read")}>
                Coba lagi
              </button>
            )}
          </>
        ) : (
          <>
            <p>Buka warung untuk mulai mencatat utang dan transaksi.</p>
            <button type="button" onClick={() => useHud.getState().setSheet("warung")}>
              Buka Warungku
            </button>
          </>
        )}
      </div>
    );
  }

  const history = data.debtHistory ?? [];
  const unpaid = data.debts.reduce((sum, d) => sum + d.amount, 0);
  if (chat)
    return (
      <div className="warung-panel notes-app" data-notes>
        <div className="notes-scroll">
          <button type="button" className="notes-return" onClick={() => setChat(null)}>
            <ArrowLeft size={16} aria-hidden /> Utang pelanggan
          </button>
          <div className="notes-contact">
            <strong>{chat.npc}</strong>
            <span>{rupiah(chat.amount)}</span>
          </div>
          <DebtChat debt={chat} onBack={() => setChat(null)} embedded />
        </div>
      </div>
    );

  return (
    <Tabs.Root defaultValue="debts" className="warung-panel notes-app" data-notes>
      <Tabs.List className="notes-tabs" aria-label="Jenis catatan">
        <Tabs.Trigger value="debts">Utang</Tabs.Trigger>
        <Tabs.Trigger value="history">Riwayat chat</Tabs.Trigger>
        <Tabs.Trigger value="cash">Kas warung</Tabs.Trigger>
      </Tabs.List>
      <Tabs.Content value="debts" className="notes-scroll">
        {data.debts.length > 0 ? (
          <section aria-label="Utang yang belum dibayar">
            <div className="notes-outstanding">
              <h3>Total belum dibayar</h3>
              <strong>{rupiah(unpaid)}</strong>
            </div>
            <ul className="notes-debts">
              {data.debts.map((d) => {
                const loan = d.kind === "pinjam_uang";
                return (
                  <li key={debtKey(d)}>
                    <div className="notes-contact">
                      <strong>{d.npc}</strong>
                      <span>{rupiah(d.amount)}</span>
                    </div>
                    <p>Jatuh tempo {formatDue(d.dueAt)}</p>
                    <p>{loan ? "Pinjaman uang" : debtorSpot(d.id).area}</p>
                    <div className="notes-actions">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => (loan && d.npcKey ? openNpcContact(d.npcKey) : setChat(d))}
                      >
                        <MessageCircle size={14} aria-hidden /> Tagih via chat
                      </button>
                      {!loan && (
                        <button type="button" onClick={() => trackDebtor(d)}>
                          <MapPin size={14} aria-hidden /> Cari di peta
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          </section>
        ) : (
          <p className="notes-clear">Tidak ada utang yang perlu ditagih.</p>
        )}
      </Tabs.Content>
      <Tabs.Content value="history" className="notes-scroll">
        {history.length > 0 ? (
          <section className="notes-history" aria-label="Riwayat utang">
            {history.map((d) => (
              <details key={debtKey(d)} className="notes-details">
                <summary>
                  <span className="notes-history-name">
                    <strong>{d.npc}</strong>
                    <span>{rupiah(d.amount)}</span>
                  </span>
                  <span className="notes-status" data-status={d.status}>
                    {DEBT_STATUS_LABEL[d.status]}
                  </span>
                  <ChevronDown size={14} aria-hidden />
                </summary>
                <WarungDebtThread debt={d} />
              </details>
            ))}
          </section>
        ) : (
          <p className="notes-clear">Belum ada riwayat chat utang.</p>
        )}
      </Tabs.Content>
      <Tabs.Content value="cash" className="notes-scroll">
        <NotesCashLedger />
      </Tabs.Content>
    </Tabs.Root>
  );
}
