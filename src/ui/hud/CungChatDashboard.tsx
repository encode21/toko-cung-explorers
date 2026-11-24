import { useId } from "react";
import { ChevronDown, NotebookPen, ReceiptText, ShoppingBasket } from "lucide-react";
import { rupiah } from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import { useHud } from "@/state/hud-store";
import "./cung-chat-dashboard.css";

export function CungChatDashboard({
  onOpenBill,
  expanded,
  onExpandedChange,
}: {
  onOpenBill: () => void;
  expanded: boolean;
  onExpandedChange: (expanded: boolean) => void;
}) {
  const data = useWarung((state) => state.data);
  const detailId = useId();
  if (!data?.warung) return null;
  const loan = data.kasbon;
  return (
    <section className="warung-card cung-chat-account" aria-label="Ringkasan warung">
      <div className="cung-chat-account-main">
        <div className="cung-chat-account-heading">
          <strong>Kas warung</strong>
          <button
            type="button"
            className="cung-chat-account-toggle"
            aria-expanded={expanded}
            aria-controls={detailId}
            onClick={() => onExpandedChange(!expanded)}
          >
            Detail <ChevronDown aria-hidden="true" />
          </button>
        </div>
        <dl className="cung-chat-account-balance">
          <dt>{data.warung.name}</dt>
          <dd>{rupiah(data.warung.cash)}</dd>
        </dl>
        {loan && (
          <p className="cung-chat-account-used">
            Kasbon belum lunas <strong>{rupiah(loan.balance)}</strong>
          </p>
        )}
        <div id={detailId} hidden={!expanded} className="cung-chat-account-detail">
          {loan && (
            <dl>
              <div>
                <dt>Sisa kasbon stok</dt>
                <dd>{rupiah(loan.available)}</dd>
              </div>
              <div>
                <dt>Batas kasbon</dt>
                <dd>{rupiah(loan.limit)}</dd>
              </div>
            </dl>
          )}
          {!loan && <p>Kasbon stok belum tersedia.</p>}
          {loan && (
            <>
              <p>{loan.text["hint"]}</p>
              <p>{loan.text["repayment"]?.replace(":percent", String(loan.repayPercent))}</p>
            </>
          )}
          {data.gangMessages?.map((message) => (
            <div className="cung-chat-account-message" key={message.id}>
              <strong>{message.npc}</strong>
              <p>{message.text}</p>
              <small>
                {data.rent?.text?.["relief"] ?? "Keringanan"} · {rupiah(message.amount)}
              </small>
            </div>
          ))}
        </div>
      </div>
      <nav className="cung-chat-account-actions" aria-label="Aksi warung">
        <button type="button" onClick={() => useHud.getState().setSheet("tokocung")}>
          <ShoppingBasket aria-hidden="true" />
          <span>Belanja</span>
        </button>
        <button type="button" data-chat-open-bill onClick={onOpenBill}>
          <ReceiptText aria-hidden="true" />
          <span>Tagihan</span>
        </button>
        <button type="button" onClick={() => useHud.getState().setSheet("notes")}>
          <NotebookPen aria-hidden="true" />
          <span>Catatan</span>
        </button>
      </nav>
    </section>
  );
}
