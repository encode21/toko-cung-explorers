import { useCallback, useEffect, useRef, useState } from "react";
import { AlarmClock, BedDouble, MoonStar } from "lucide-react";
import { useGame } from "@/state/game-store";
import { HOME_SPOTS, nearHomeSpot } from "@/game/home/model";
import { useHome } from "@/game/home/store";
import { napEnergy, type Nap } from "./model";
import { useAccount } from "@/auth/useSession";
import { useChannels } from "@/net/channel-store";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import {
  endHomeSleep,
  sleepNoWarung,
  sleepWithWarung,
  startBedNap,
  usePulang,
  wakeBedNap,
} from "@/game/prolog/pulang/steps";
import { useWarung } from "@/game/warung/store";
import { clearEnergy, energyCommand, useEnergy } from "./store";

/** Reads energy while playing (refreshing every minute for regen) and hosts the sleep choice. */
export function EnergyRuntime() {
  const account = useAccount((s) => s.user);
  const playing = useChannels((s) => s.playing);
  const choice = useEnergy((s) => s.sleepChoice);
  const nap = useEnergy((s) => s.nap);
  const enabled = useEnergy((s) => s.enabled);
  const hasWarung = useWarung((s) => !!s.data?.warung);
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
  useEffect(
    () =>
      useEnergy.subscribe((energy, previous) => {
        if (previous.nap && !energy.nap && usePulang.getState().sleepMode === "regular")
          endHomeSleep();
      }),
    [],
  );
  if (!choice) return nap ? <NapPanel nap={nap} /> : null;
  return (
    <GameModal
      title="Tidur sekarang?"
      className="game-light"
      onClose={endHomeSleep}
      footer={
        <GameButton className="game-button-soft" onClick={endHomeSleep}>
          Batal
        </GameButton>
      }
    >
      <div className="game-light-grid">
        {enabled && (
          <button type="button" className="game-light-card" onClick={() => void startBedNap()}>
            <span className="game-light-icon" aria-hidden="true">
              <BedDouble />
            </span>
            <span>
              <strong>Tidur sebentar</strong>
              <small>Pulihkan energi sambil waktu game terus berjalan.</small>
            </span>
          </button>
        )}
        {hasWarung && (
          <button
            type="button"
            className="game-light-card"
            onClick={() => void sleepWithWarung(true)}
          >
            <span className="game-light-icon" aria-hidden="true">
              <AlarmClock />
            </span>
            <span>
              <strong>Pasang alarm</strong>
              <small>Bangun tepat waktu buka warung, tapi badan masih capek.</small>
            </span>
          </button>
        )}
        <button
          type="button"
          className="game-light-card"
          onClick={() => void (hasWarung ? sleepWithWarung(false) : sleepNoWarung())}
        >
          <span className="game-light-icon" aria-hidden="true">
            <MoonStar />
          </span>
          <span>
            <strong>{hasWarung ? "Tidur sampai puas" : "Tidur sampai pagi"}</strong>
            <small>
              {hasWarung
                ? "Energi penuh, tapi bisa kesiangan dan warung telat buka."
                : "Lanjutkan permainan saat pagi dengan energi pulih."}
            </small>
          </span>
        </button>
      </div>
    </GameModal>
  );
}

/** Estimate energy while sleeping. The server settles it when the player wakes. */
function NapPanel({ nap }: { nap: Nap }) {
  const energy = useEnergy();
  const [now, setNow] = useState(Date.now());
  const value = napEnergy(energy, nap, now);
  const waking = useRef(false);
  const [pending, setPending] = useState(false);
  const wake = useCallback(async () => {
    if (waking.current) return;
    waking.current = true;
    setPending(true);
    try {
      await wakeBedNap();
    } finally {
      waking.current = false;
      setPending(false);
    }
  }, []);
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 500);
    return () => window.clearInterval(t);
  }, []);
  const offBed =
    !useHome.getState().inside || !nearHomeSpot(useGame.getState().playerPos, HOME_SPOTS.bed, 2.6);
  const finished = value >= energy.max && energy.value < energy.max;
  useEffect(() => {
    if (finished || offBed) void wake();
  }, [finished, offBed, wake]);
  return (
    <GameModal
      title="Sedang tidur"
      className="game-light"
      closeLabel="Bangun"
      onClose={() => void wake()}
      footer={
        <GameButton disabled={pending} onClick={() => void wake()}>
          {pending ? "Sedang bangun…" : "Bangun"}
        </GameButton>
      }
    >
      <p>
        Energi {value}/{energy.max}. Waktu tetap berjalan, bangun kapan saja.
      </p>
      <progress max={energy.max} value={value} aria-label="Energi" style={{ width: "100%" }} />
    </GameModal>
  );
}
