import { useEffect } from "react";
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
  if (!choice) return null;
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
