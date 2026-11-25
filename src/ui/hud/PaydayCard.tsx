import { useWarung } from "@/game/warung/store";
import { rupiah } from "@/game/warung/model";
import { QuestTrackerButton } from "./QuestTrackerCard";
import "./warung-panel.css";

/** Offline sales the server settled on the next visit or login. */
export function PaydayCard() {
  const payday = useWarung((s) => s.payday);
  // Stays until Tutup (acknowledge); it is a small card, not a modal.
  if (!payday) return null;
  return (
    <section
      className="payday-card warung-card quest-tracker"
      aria-label="Pendapatan selagi pergi"
      data-ui-panel
      data-hud-control
    >
      <h2>Penjualan karyawan selama kamu pergi</h2>
      <strong>{rupiah(payday.revenue)}</strong>
      <p>
        {payday.pieces} barang terjual · {payday.minutes} menit operasional
      </p>
      {payday.items && <p>Terjual: {payday.items}</p>}
      <p>Hasil penjualan sudah masuk Kas toko.</p>
      {payday.restock && <p>{payday.restock}</p>}
      <QuestTrackerButton onClick={() => useWarung.setState({ payday: null })}>
        Tutup
      </QuestTrackerButton>
    </section>
  );
}
