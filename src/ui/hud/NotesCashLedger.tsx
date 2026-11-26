import { useState } from "react";
import { isCashMovement } from "@/game/gang/economy";
import { rupiah } from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import { JournalFilterPills, JournalList, type JournalFilter } from "./WarungPanel";
import "./notes-cash.css";

export function NotesCashLedger() {
  const journal = useWarung((state) => state.data?.journal);
  const [filter, setFilter] = useState<JournalFilter>("all");
  if (!journal) return null;
  if (journal.length === 0)
    return (
      <p className="notes-cash-empty">
        Belum ada transaksi. Hasil jualan dan pembelian stok akan tercatat di sini.
      </p>
    );

  let income = 0;
  let expenses = 0;
  for (const entry of journal) {
    if (!isCashMovement(entry)) continue;
    if (entry.amount < 0) expenses -= entry.amount;
    else income += entry.amount;
  }

  return (
    <div className="notes-cash">
      <section aria-label="Ringkasan kas">
        <h3>Ringkasan {journal.length} catatan terakhir</h3>
        <dl className="notes-cash-totals">
          <div>
            <dt>Uang masuk</dt>
            <dd>{rupiah(income)}</dd>
          </div>
          <div>
            <dt>Uang keluar</dt>
            <dd>{rupiah(expenses)}</dd>
          </div>
        </dl>
      </section>
      <section className="notes-cash-entries" aria-label="Riwayat transaksi">
        <h3>Riwayat transaksi</h3>
        <JournalFilterPills filter={filter} onChange={setFilter} />
        <JournalList filter={filter} />
      </section>
    </div>
  );
}
