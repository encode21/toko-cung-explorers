import { create } from "zustand";

interface ControlState {
  playerReady: boolean;
  jumpQueued: boolean;
  truckBrakeHeld: boolean;
  setTruckBrakeHeld: (held: boolean) => void;
  setPlayerReady: (ready: boolean) => void;
  queueJump: () => void;
  consumeJump: () => boolean;
}

/** Status kontrol yang dibagi antara pemain 3D dan kontrol sentuh DOM. */
export const useControls = create<ControlState>((set, get) => ({
  playerReady: false,
  jumpQueued: false,
  truckBrakeHeld: false,
  setTruckBrakeHeld: (truckBrakeHeld) => set({ truckBrakeHeld }),
  setPlayerReady: (playerReady) => set({ playerReady }),
  queueJump: () => set({ jumpQueued: true }),
  consumeJump: () => {
    if (!get().jumpQueued) return false;
    set({ jumpQueued: false });
    return true;
  },
}));
