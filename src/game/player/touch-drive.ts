import { analogRunning } from "./analog-run";
import { useGameSettings } from "@/state/game-settings";
import { create } from "zustand";

/** Batas delta look per frame (px) supaya swipe tidak melonjak. */
const LOOK_FRAME_CLAMP = 48;
/** Keep stick intent briefly if a second finger causes a one-frame cancel on some WebViews. */
const STICK_HOLD_MS = 180;

interface TouchDriveState {
  moveX: number;
  moveY: number;
  lookX: number;
  lookY: number;
  active: boolean;
  running: boolean;
  /** Last non-zero stick sample + timestamp for short multitouch cancel grace. */
  heldX: number;
  heldY: number;
  heldAt: number;
  setMove: (x: number, y: number, rawStrength?: number) => void;
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
  running: false,
  heldX: 0,
  heldY: 0,
  heldAt: 0,
  setMove: (x, y, rawStrength = Math.hypot(x, y)) => {
    const moveX = Math.max(-1, Math.min(1, x));
    const moveY = Math.max(-1, Math.min(1, y));
    const active = Math.abs(moveX) > 0.04 || Math.abs(moveY) > 0.04;
    set({
      moveX,
      moveY,
      running: analogRunning(rawStrength, get().running),
      active,
      ...(active ? { heldX: moveX, heldY: moveY, heldAt: performance.now() } : {}),
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
  resetMove: () =>
    set({ moveX: 0, moveY: 0, active: false, running: false, heldX: 0, heldY: 0, heldAt: 0 }),
  resetLook: () => set({ lookX: 0, lookY: 0 }),
  reset: () =>
    set({
      moveX: 0,
      moveY: 0,
      lookX: 0,
      lookY: 0,
      active: false,
      running: false,
      heldX: 0,
      heldY: 0,
      heldAt: 0,
    }),
}));

/** API kompatibel untuk pemanggilan imperatif dari DOM / useFrame. */
export function setTouchMove(x: number, y: number) {
  const strength = Math.hypot(x, y);
  const gain = useGameSettings.getState().joystickSensitivity;
  const adjusted = strength < 0.08 ? 0 : Math.min(1, ((strength - 0.08) / 0.92) * gain);
  useTouchDrive
    .getState()
    .setMove(
      strength ? (x / strength) * adjusted : 0,
      strength ? (y / strength) * adjusted : 0,
      strength,
    );
}

export function addTouchLook(x: number, y: number) {
  const sensitivity = useGameSettings.getState().cameraSensitivity;
  useTouchDrive.getState().addLook(x * sensitivity, y * sensitivity);
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
  if (s.active) return { moveX: s.moveX, moveY: s.moveY, active: true, running: s.running };
  // Brief grace after a cancel so jump+stick multitouch does not zero air control.
  if (performance.now() - s.heldAt < STICK_HOLD_MS && (s.heldX !== 0 || s.heldY !== 0))
    return { moveX: s.heldX, moveY: s.heldY, active: true, running: s.running };
  return { moveX: 0, moveY: 0, active: false, running: false };
}
