import { HudBalance } from "./HudBalance";
import { useGameCore } from "@/game/core/store";
import { useOjek } from "@/game/ojek/store";
import { useWarung } from "@/game/warung/store";
import "./player-status.css";

/** Read-only Point balance; detailed progression remains in the player profile. */
export function UtilityBar() {
  const points = useGameCore((s) => s.snapshot?.wallet.current_balance);
  // Kas usaha (shared business wallet); only once the player owns a warung.
  const warungCash = useWarung((s) => s.data?.warung?.cash);
  const ojek = useOjek((s) => s.data?.ojek);
  const kas = warungCash ?? ojek?.cash;
  const savings = useWarung((s) => s.data?.savings) ?? ojek?.savings;
  // Inside a warung its own top bar shows Kas and sits where these pills are.
  const inWarung = useWarung((s) => !!s.inside);
  if (inWarung) return null;
  return (
    <div data-utility-bar className="mmo-utilitybar" role="group" aria-label="Point dan Kas pemain">
      <HudBalance kind="point" value={points} />
      {kas != null ? (
        <HudBalance kind="kas" value={kas} />
      ) : (
        savings != null && <HudBalance kind="savings" value={savings} />
      )}
    </div>
  );
}
