import { useRef } from "react";
import { CalendarClock, CircleCheck, ReceiptText, TriangleAlert } from "lucide-react";
import { createId } from "@/lib/id";
import { useWarung, warungCommand } from "@/game/warung/store";
import { rupiah, type WarungRent } from "@/game/warung/model";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import "./warung-bill.css";

export function GangCosts({ rent, bill = false }: { rent: WarungRent; bill?: boolean }) {
  if (rent.kind !== "gang" || (!rent.text && !bill)) return null;
  const t = rent.text ?? {};
  const costs = [
    { key: "electricity", label: t["electricity"] ?? "Listrik", amount: rent.electricity },
    { key: "dues", label: t["dues"] ?? "Iuran RT", amount: rent.dues },
    {
      key: "staff",
      label: t["staff"] ?? "Gaji karyawan (transfer di CngBank)",
      amount: rent.dailyStaff,
    },
    {
      key: "total",
      label: t["total"] ?? "Total biaya harian",
      amount: rent.dailyTotal ?? rent.daily,
    },
  ];
  return (
    <div className="warung-list">
      <dl className="warung-stats">
        {costs
          .filter(({ amount }) => !bill || amount != null)
          .map(({ key, label, amount }) => (
            <div key={key}>
              <dt>{label}</dt>
              <dd>{rupiah(amount ?? 0)}</dd>
            </div>
          ))}
      </dl>
      {t["hint"] && <p className="warung-hint">{t["hint"]}</p>}
    </div>
  );
}

export function GangBillCard({ embedded = false }: { embedded?: boolean }) {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const pending = useRef<Record<string, string>>({});
  const rent = data?.rent;
  if (rent?.kind !== "gang" || (embedded && !rent.text)) return null;
  const pay = async (action: "pay_rent" | "rent_bargain") => {
    // An uncertain response retries the same payment, never a second debit.
    pending.current[action] ??= createId();
    const s = await warungCommand(action, { requestId: pending.current[action] });
    if (s) delete pending.current[action];
  };
  const t = rent.text ?? {};
  const title = t["title"] ?? "Tagihan listrik & iuran";
  const owed = rent.owedDays > 0;
  const cash = data?.warung?.cash ?? 0;
  const payable =
    rent.daily > 0 ? Math.min(rent.owed, Math.floor(cash / rent.daily) * rent.daily) : 0;
  const countdown = t["countdown"]
    ?.replace(":days", String(rent.owedDays))
    .replace(":left", String(Math.max(0, rent.sealDays - rent.owedDays)));
  const actions = owed && (
    <div className={embedded ? "warung-chat-replies" : "warung-bill-actions"}>
      <button
        type="button"
        className="warung-cta"
        disabled={busy || payable <= 0}
        onClick={() => void pay("pay_rent")}
      >
        {!embedded && <KasMoneyIcon />}
        {t["pay"] ?? "Bayar"}
        {(embedded || payable > 0) && ` · ${rupiah(payable)}`}
      </button>
      {rent.canBargain && (
        <button
          type="button"
          className="warung-secondary"
          disabled={busy}
          onClick={() => void pay("rent_bargain")}
        >
          {t["dispensation"] ?? "Minta dispensasi"}
        </button>
      )}
    </div>
  );

  if (!embedded) {
    const status = rent.sealed ? "sealed" : owed ? "due" : "settled";
    const StatusIcon = rent.sealed ? TriangleAlert : owed ? CalendarClock : CircleCheck;
    const message = rent.sealed
      ? "Lunasi tunggakan untuk membuka kembali warung."
      : owed
        ? countdown || `Tunggakan ${rent.owedDays} hari.`
        : (t["paid"] ?? "Tidak ada tagihan yang perlu dibayar.");
    const dueTime = `${String(rent.dueHour).padStart(2, "0")}.00`;
    const hint = t["hint"]?.toLowerCase();
    const hintShowsDueTime =
      hint?.includes(`pukul ${dueTime}`) || hint?.includes(`pukul ${dueTime.replace(".", ":")}`);
    return (
      <div className="warung-bill">
        <div className="warung-bill-layout">
          <section className="warung-bill-summary">
            <header className="warung-bill-header">
              <span className="warung-bill-art">
                <ReceiptText size={25} aria-hidden />
              </span>
              <div>
                <h4>{title}</h4>
                <p>{rent.landlord}</p>
              </div>
            </header>
            <div className="warung-bill-total">
              <div>
                <span>Total tagihan</span>
                <strong>{rupiah(rent.owed)}</strong>
              </div>
              <span className="warung-bill-status" data-status={status}>
                {rent.sealed
                  ? (t["sealed"] ?? "Warung disegel")
                  : owed
                    ? "Menunggak"
                    : "Tidak ada tunggakan"}
              </span>
            </div>
            <p className="warung-bill-message" data-status={status}>
              <StatusIcon size={16} aria-hidden />
              <span>{message}</span>
            </p>
            {actions}
            {owed && cash < rent.daily && (
              <p className="warung-bill-shortfall">
                Kas kurang {rupiah(rent.daily - cash)} untuk membayar satu hari.
              </p>
            )}
            {payable > 0 && payable < rent.owed && (
              <p className="warung-bill-shortfall">
                Nominal ini membayar {Math.floor(payable / rent.daily)} dari {rent.owedDays} hari.
              </p>
            )}
          </section>
          <section className="warung-bill-breakdown">
            <header className="warung-bill-breakdown-head">
              <h4>Rincian biaya harian</h4>
              {!hintShowsDueTime && <p>Jatuh tempo pukul {dueTime} WIB</p>}
            </header>
            <GangCosts rent={rent} bill />
          </section>
        </div>
      </div>
    );
  }

  return (
    <section className="warung-card warung-life" data-tone={rent.sealed ? "danger" : "warn"}>
      <div className="warung-card-head">
        <strong>{rent.landlord}</strong>
        <span className="warung-level-pill">{rent.sealed ? t["sealed"] : t["title"]}</span>
      </div>
      <ol className="warung-chat-thread">
        <li data-from="koko">
          {rent.owedDays
            ? `${rent.owedDays} × ${rupiah(rent.daily)} = ${rupiah(rent.owed)}`
            : t["paid"]}
        </li>
        {owed && !rent.sealed && countdown && <li data-from="koko">{countdown}</li>}
        <li data-from="koko" className="cung-chat-bill">
          <GangCosts rent={rent} />
        </li>
      </ol>
      {actions}
    </section>
  );
}

export function KasbonCard() {
  const loan = useWarung((s) => s.data?.kasbon);
  if (!loan) return null;
  return (
    <section className="warung-card">
      <strong>{loan.text["title"]}</strong>
      <dl className="warung-stats">
        <div>
          <dt>{loan.text["balance"]}</dt>
          <dd>{rupiah(loan.balance)}</dd>
        </div>
        <div>
          <dt>{loan.text["available"]}</dt>
          <dd>{rupiah(loan.available)}</dd>
        </div>
      </dl>
      <p className="warung-hint">{loan.text["hint"]}</p>
      <p className="warung-hint">
        {loan.text["repayment"]?.replace(":percent", String(loan.repayPercent))}
      </p>
    </section>
  );
}

export function GangWelcome() {
  const data = useWarung((s) => s.data);
  return (
    <>
      {data?.gangMessages?.map((m) => (
        <section className="warung-card" key={m.id}>
          <strong>{m.npc}</strong>
          <ol className="warung-chat-thread">
            <li data-from="koko">{m.text}</li>
          </ol>
          <p className="warung-hint">
            {data.rent?.text?.["relief"]}: {rupiah(m.amount)}
          </p>
        </section>
      ))}
    </>
  );
}
