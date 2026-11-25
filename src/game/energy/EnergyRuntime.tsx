import { useEffect, useState } from "react";
import { useGame } from "@/state/game-store";
import { HOME_SPOTS, nearHomeSpot } from "@/game/home/model";
import { useHome } from "@/game/home/store";
import { napEnergy, type Nap } from "./model";
import { useAccount } from "@/auth/useSession";
import { useChannels } from "@/net/channel-store";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import { sleepWithWarung } from "@/game/prolog/pulang/steps";
import { clearEnergy, energyCommand, useEnergy } from "./store";

/** Reads energy while playing (refreshing every minute for regen) and hosts the sleep choice. */
export function EnergyRuntime() {
  const account = useAccount((s) => s.user);
  const playing = useChannels((s) => s.playing);
  const choice = useEnergy((s) => s.sleepChoice);
  const nap = useEnergy((s) => s.nap);
  useEffect(() => {
    if (!account || !playing) return;
    const refresh = () => {
      if (document.visibilityState === "visible") void energyCommand("read");
    };
    refresh();
    const interval = window.setInterval(refresh, 60000);
    return () => {
      window.clearInterval(interval);
      clearEnergy();
    };
  }, [account, playing]);
  if (!choice) return nap ? <NapPanel nap={nap} /> : null;
  const close = () => useEnergy.setState({ sleepChoice: false });
  const pick = (alarm: boolean) => {
    close();
    void sleepWithWarung(alarm);
  };
  return (
    <GameModal
      title="Tidur sekarang?"
      className="game-light"
      onClose={close}
      footer={
        <GameButton className="game-button-soft" onClick={close}>
          Batal
        </GameButton>
      }
    >
      <div className="game-light-grid">
        <button type="button" className="game-light-card" onClick={() => pick(true)}>
          <span className="game-light-icon" aria-hidden="true">
            ⏰
          </span>
          <span>
            <strong>Pasang alarm</strong>
            <small>Bangun tepat waktu buka warung, tapi badan masih capek.</small>
          </span>
        </button>
        <button type="button" className="game-light-card" onClick={() => pick(false)}>
          <span className="game-light-icon" aria-hidden="true">
            😴
          </span>
          <span>
            <strong>Tidur sampai puas</strong>
            <small>Energi penuh, tapi bisa kesiangan dan warung telat buka.</small>
          </span>
        </button>
      </div>
    </GameModal>
  );
}

/** Rebahan: a live estimate while lying down; getting up (button, full bar, or walking off the kasur) asks the server. */
function NapPanel({ nap }: { nap: Nap }) {
  const energy = useEnergy();
  const [now, setNow] = useState(Date.now());
  const value = napEnergy(energy, nap, now);
  const wake = () => void energyCommand("nap_end");
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);
  const offBed =
    !useHome.getState().inside || !nearHomeSpot(useGame.getState().playerPos, HOME_SPOTS.bed, 2.6);
  useEffect(() => {
    if (value >= energy.max || offBed) wake();
  }, [value >= energy.max, offBed]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <GameModal
      title="😴 Rebahan…"
      className="game-light"
      onClose={wake}
      footer={<GameButton onClick={wake}>Bangun</GameButton>}
    >
      <p>
        Energi {value}/{energy.max}. Waktu tetap berjalan, bangun kapan saja.
      </p>
      <progress max={energy.max} value={value} aria-label="Energi" style={{ width: "100%" }} />
    </GameModal>
  );
}
