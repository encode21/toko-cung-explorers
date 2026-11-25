import { useRef } from "react";
import { createId } from "@/lib/id";
import { useWarung, warungCommand } from "@/game/warung/store";
import { rupiah, type WarungRent } from "@/game/warung/model";

export function GangCosts({ rent }: { rent: WarungRent }) {
  if (rent.kind !== "gang" || !rent.text) return null;
  return (
    <div className="warung-list">
      <dl className="warung-stats">
        <div>
          <dt>{rent.text["electricity"]}</dt>
          <dd>{rupiah(rent.electricity ?? 0)}</dd>
        </div>
        <div>
          <dt>{rent.text["dues"]}</dt>
          <dd>{rupiah(rent.dues ?? 0)}</dd>
        </div>
        <div>
          <dt>{rent.text["staff"]}</dt>
          <dd>{rupiah(rent.dailyStaff ?? 0)}</dd>
        </div>
        <div>
          <dt>{rent.text["total"]}</dt>
          <dd>{rupiah(rent.dailyTotal ?? rent.daily)}</dd>
        </div>
      </dl>
      <p className="warung-hint">{rent.text["hint"]}</p>
    </div>
  );
}

export function GangBillCard({ embedded = false }: { embedded?: boolean }) {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const pending = useRef<Record<string, string>>({});
  const rent = data?.rent;
  if (rent?.kind !== "gang" || !rent.text) return null;
  const pay = async (action: string) => {
    // An uncertain response retries the same payment, never a second debit.
    pending.current[action] ??= createId();
    const s = await warungCommand(action, { requestId: pending.current[action] });
    if (s) delete pending.current[action];
  };
  return (
    <section className="warung-card warung-life" data-tone={rent.sealed ? "danger" : "warn"}>
      <div className="warung-card-head">
        <strong>{rent.landlord}</strong>
        <span className="warung-level-pill">
          {rent.sealed ? rent.text["sealed"] : rent.text["title"]}
        </span>
      </div>
      <ol className="warung-chat-thread">
        <li data-from="koko">
          {rent.owedDays
            ? `${rent.owedDays} × ${rupiah(rent.daily)} = ${rupiah(rent.owed)}`
            : rent.text["paid"]}
        </li>
        {rent.owedDays > 0 && !rent.sealed && rent.text["countdown"] && (
          <li data-from="koko">
            {rent.text["countdown"]
              .replace(":days", String(rent.owedDays))
              .replace(":left", String(Math.max(0, rent.sealDays - rent.owedDays)))}
          </li>
        )}
        {embedded && (
          <li data-from="koko" className="cung-chat-bill">
            <GangCosts rent={rent} />
          </li>
        )}
      </ol>
      {rent.owedDays > 0 && (
        <div className="warung-chat-replies">
          <button
            type="button"
            className="warung-cta"
            disabled={busy || (data?.warung?.cash ?? 0) < rent.daily}
            onClick={() => void pay("pay_rent")}
          >
            {rent.text["pay"]} ·{" "}
            {rupiah(
              Math.min(rent.owed, Math.floor((data?.warung?.cash ?? 0) / rent.daily) * rent.daily),
            )}
          </button>
          {rent.canBargain && (
            <button
              type="button"
              className="warung-secondary"
              disabled={busy}
              onClick={() => void pay("rent_bargain")}
            >
              {rent.text["dispensation"]}
            </button>
          )}
        </div>
      )}
      {!embedded && <GangCosts rent={rent} />}
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
