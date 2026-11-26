import { useEffect } from "react";
import { receiptText, REVIEW_TEXT, rupiah } from "@/game/warung/model";
import { useWarung, type ServeFeedback } from "@/game/warung/store";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import "./warung-sale-toast.css";

const DISPLAY_MS = 5000;

export function WarungSaleToast({ feedback }: { feedback: ServeFeedback }) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (useWarung.getState().lastServeFeedback === feedback) {
        useWarung.setState({ lastServeFeedback: null });
      }
    }, DISPLAY_MS);
    return () => window.clearTimeout(timer);
  }, [feedback]);

  const { amount, destination, receipt, review } = feedback.result;
  const isSale = destination === "kas";
  const amountLabel = `${amount > 0 ? "+" : ""}${rupiah(amount)}`;
  const account = destination === "upah-tabungan" ? "Tabungan modal" : "Kas warung";
  return (
    <div className="warung-sale-slot">
      <div
        className="warung-sale-receipt"
        role="status"
        aria-atomic="true"
        style={{ animationDuration: `${DISPLAY_MS}ms` }}
      >
        <span className="warung-sale-icon" aria-hidden="true">
          <KasMoneyIcon />
        </span>
        <div className="warung-sale-copy">
          <strong>{isSale ? "Penjualan selesai!" : "Upah diterima!"}</strong>
          <span>
            {account} <b>{amountLabel}</b>
          </span>
          {!!receipt?.kasbon && <small>Bayar kasbon {rupiah(receipt.kasbon)}</small>}
        </div>
        {receipt && <span className="sr-only">{receiptText(receipt)}</span>}
        {review && (
          <span className="sr-only">
            {review.stars} dari 5 bintang. {REVIEW_TEXT[review.reason]}
          </span>
        )}
      </div>
    </div>
  );
}
