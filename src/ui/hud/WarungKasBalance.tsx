import { useWarung } from "@/game/warung/store";
import { rupiah } from "@/game/warung/model";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import "./warung-kas-balance.css";

/** Live business cash in the shared panel header. */
export function WarungKasBalance() {
  const cash = useWarung((state) => state.data?.warung?.cash);
  if (cash === undefined) return null;
  const amount = rupiah(cash);
  return (
    <div
      className="warung-kas-balance"
      aria-label={`Kas warung ${amount}`}
      title={`Kas warung ${amount}`}
    >
      <KasMoneyIcon className="warung-kas-icon" />
      <span aria-hidden="true">{amount}</span>
    </div>
  );
}
