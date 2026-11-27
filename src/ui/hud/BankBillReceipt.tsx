import { useEffect, useRef } from "react";
import { Check } from "lucide-react";
import { isCashMovement } from "@/game/gang/economy";
import { rupiah, type WarungRent, type WarungSnapshot } from "@/game/warung/model";
import { PhoneAppArtwork } from "./PhoneAppArtwork";

type BillPayment = {
  amount: number;
  at: string;
  days: number;
  costs?: { electricity: number; dues: number };
};

function lastBillPayment(
  rent: WarungRent,
  journal: WarungSnapshot["journal"],
): BillPayment | undefined {
  for (const [index, row] of journal.entries()) {
    if (row.qty <= 0 || row.amount > 0 || !isCashMovement(row)) continue;
    if (rent.kind !== "gang") {
      if (row.type === "SEWA" && row.amount < 0)
        return { amount: -row.amount, at: row.at, days: row.qty };
      continue;
    }
    // Kampung billing writes its only daily dues together with electricity.
    const dues = journal[index + 1];
    if (
      row.type === "LISTRIK" &&
      dues?.type === "IURAN" &&
      dues.qty === row.qty &&
      dues.amount <= 0 &&
      row.amount + dues.amount < 0 &&
      isCashMovement(dues) &&
      dues.cashAfter + row.amount === row.cashAfter
    ) {
      return {
        amount: -(row.amount + dues.amount),
        at: row.at,
        days: row.qty,
        costs: { electricity: -row.amount, dues: -dues.amount },
      };
    }
  }
  return undefined;
}

const paidDate = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "long",
  timeZone: "Asia/Jakarta",
});
const paymentTime = new Intl.DateTimeFormat("id-ID", {
  dateStyle: "medium",
  timeStyle: "medium",
  timeZone: "Asia/Jakarta",
});

export function BankBillReceipt({
  rent,
  warungName,
  journal,
  focusHeading,
}: {
  rent: WarungRent;
  warungName: string;
  journal: WarungSnapshot["journal"];
  focusHeading: boolean;
}) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (focusHeading) heading.current?.focus();
  }, [focusHeading]);

  const payment = lastBillPayment(rent, journal);
  const at = payment ? Date.parse(payment.at) : NaN;
  const until = Date.parse(rent.paidUntil);

  return (
    <section className="bank-bill bank-receipt" aria-label="Struk tagihan">
      <div className="bank-receipt-brand">
        <PhoneAppArtwork kind="cngbank" />
        <span>CNG Bank</span>
      </div>
      <div className="bank-receipt-summary">
        <span className="bank-receipt-check" aria-hidden="true">
          <Check size={27} strokeWidth={3} />
        </span>
        <h3 ref={heading} tabIndex={-1}>
          Tagihan lunas
        </h3>
        {payment && Number.isFinite(at) && (
          <time dateTime={payment.at}>{paymentTime.format(at)} WIB</time>
        )}
        <div className="bank-receipt-amount">
          <span>{payment ? "Pembayaran terakhir" : "Sisa tagihan"}</span>
          <strong className="bank-receipt-total">{rupiah(payment?.amount ?? 0)}</strong>
        </div>
      </div>
      <dl className="bank-lines">
        <div>
          <dt>Jenis tagihan</dt>
          <dd>
            {rent.kind === "gang" ? "Listrik & iuran keamanan dan kebersihan RT" : "Sewa warung"}
          </dd>
        </div>
        <div>
          <dt>Penerima</dt>
          <dd>{rent.landlord}</dd>
        </div>
        <div>
          <dt>Warung</dt>
          <dd>{warungName}</dd>
        </div>
        {payment && (
          <>
            <div>
              <dt>Sumber dana</dt>
              <dd>Kas usaha</dd>
            </div>
            <div>
              <dt>Hari dibayar</dt>
              <dd>{payment.days} hari</dd>
            </div>
            {payment.costs && (
              <>
                <div>
                  <dt>Listrik</dt>
                  <dd>{rupiah(payment.costs.electricity)}</dd>
                </div>
                <div>
                  <dt>Iuran</dt>
                  <dd>{rupiah(payment.costs.dues)}</dd>
                </div>
              </>
            )}
          </>
        )}
        {Number.isFinite(until) && (
          <div>
            <dt>Lunas sampai</dt>
            <dd>
              <time dateTime={rent.paidUntil}>{paidDate.format(until)}</time>
            </dd>
          </div>
        )}
      </dl>
    </section>
  );
}
