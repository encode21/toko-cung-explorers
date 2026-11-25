import { KasbonCard } from "@/game/gang/GangEconomyCards";
import { isCashMovement } from "@/game/gang/economy";
import { useEffect, useState } from "react";
import { ensureWarungData, useWarung, warungCommand } from "@/game/warung/store";
import { rupiah } from "@/game/warung/model";
import { Catatan, JournalFilterPills, JournalList, type JournalFilter } from "./WarungPanel";
import "./warung-panel.css";
import { useHud } from "@/state/hud-store";
import { CngBankPay } from "./CngBankPay";
import { PrologNotes } from "@/game/prolog/PrologUI";
import { StoryBook } from "./StoryBook";

function useWarungData() {
  useEffect(() => void ensureWarungData(), []);
  return useWarung((s) => s.data);
}

function NoWarung() {
  return <p className="warung-hint">Buka warung dulu di aplikasi Warungku.</p>;
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
  const [filter, setFilter] = useState<JournalFilter>("all");
  const data = useWarungData();
  const busy = useWarung((s) => s.busy);
  const paying = useHud((s) => s.cngbankPay);
  if (!data?.warung) return <NoWarung />;
  if (paying) return <CngBankPay />;
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
              <JournalFilterPills filter={filter} onChange={setFilter} />
            </div>
            <JournalList filter={filter} withItems={false} />
          </section>
        </div>
      </div>
    </div>
  );
}
