import { create } from "zustand";

/** Batas delta look per frame (px) supaya swipe tidak melonjak. */
const LOOK_FRAME_CLAMP = 48;

interface TouchDriveState {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  active: boolean;
  setMove: (x: number, y: number) => void;
  addLook: (x: number, y: number) => void;
  consumeLook: () => { x: number; y: number };
  resetMove: () => void;
  resetLook: () => void;
  reset: () => void;
}

/**
 * Shared lewat Zustand (bukan singleton modul) supaya overlay DOM dan Player R3F
 * membaca instance state yang sama — Vite/jsxImportSource bisa menduplikasi modul.
 */
export const useTouchDrive = create<TouchDriveState>((set, get) => ({
  moveX: 0,
  moveY: 0,
  lookX: 0,
  lookY: 0,
  active: false,
  setMove: (x, y) => {
    const moveX = Math.max(-1, Math.min(1, x));
    const moveY = Math.max(-1, Math.min(1, y));
    set({
      moveX,
      moveY,
      active: Math.abs(moveX) > 0.04 || Math.abs(moveY) > 0.04,
    });
  },
  addLook: (x, y) => set((s) => ({ lookX: s.lookX + x, lookY: s.lookY + y })),
  consumeLook: () => {
    const { lookX, lookY } = get();
    set({ lookX: 0, lookY: 0 });
    return {
      x: Math.max(-LOOK_FRAME_CLAMP, Math.min(LOOK_FRAME_CLAMP, lookX)),
      y: Math.max(-LOOK_FRAME_CLAMP, Math.min(LOOK_FRAME_CLAMP, lookY)),
    };
  },
  resetMove: () => set({ moveX: 0, moveY: 0, active: false }),
  resetLook: () => set({ lookX: 0, lookY: 0 }),
  reset: () => set({ moveX: 0, moveY: 0, lookX: 0, lookY: 0, active: false }),
}));

/** API kompatibel untuk pemanggilan imperatif dari DOM / useFrame. */
export function setTouchMove(x: number, y: number) {
  useTouchDrive.getState().setMove(x, y);
}

export function addTouchLook(x: number, y: number) {
  useTouchDrive.getState().addLook(x, y);
}

export function consumeTouchLook() {
  return useTouchDrive.getState().consumeLook();
}

export function resetTouchMove() {
  useTouchDrive.getState().resetMove();
}

export function resetTouchLook() {
  useTouchDrive.getState().resetLook();
}

export function resetTouchDrive() {
  useTouchDrive.getState().reset();
}

/** Snapshot sinkron untuk useFrame (hindari stale closure). */
export function getTouchDrive() {
  const s = useTouchDrive.getState();
  return { moveX: s.moveX, moveY: s.moveY, active: s.active };
}
