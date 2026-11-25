import { useWarung } from "@/game/warung/store";
import { rupiah } from "@/game/warung/model";
import "./warung-panel.css";

/** Offline sales the server settled on the next visit or login. */
export function PaydayCard() {
  const payday = useWarung((s) => s.payday);
  // Stays until Tutup (acknowledge); it is a small card, not a modal.
  if (!payday) return null;
  return (
    <section className="payday-card warung-card" aria-label="Pendapatan selagi pergi">
      <small>Selagi kamu pergi</small>
      <strong>{rupiah(payday.revenue)}</strong>
      <p>
        {payday.pieces} barang · {payday.customers} pembeli · {payday.minutes} menit
      </p>
      {payday.items && <p>Terjual: {payday.items}</p>}
      {payday.restock && <p>{payday.restock}</p>}
      <button
        type="button"
        className="warung-cta"
        onClick={() => useWarung.setState({ payday: null })}
      >
        Tutup
      </button>
    </section>
  );
}
