import { useEffect, useRef } from "react";

export interface DriveState {
  /** -1..1 — maju (positif) / mundur (negatif). */
  throttle: number;
  /** -1..1 — putar kamera ke kiri (positif) / kanan (negatif). */
  turn: number;
  active: boolean;
}

const DEAD_ZONE = 10;
const FULL_DRAG = 110;

/**
 * Kontrol "tahan klik kanan lalu geser": geser ke atas = maju, ke bawah =
 * mundur, ke kiri/kanan = memutar arah pandang. Listener dipasang di window
 * supaya drag tetap terbaca walau kursor keluar dari canvas.
 */
export function useMouseDrive() {
  const drive = useRef<DriveState>({ throttle: 0, turn: 0, active: false });

  useEffect(() => {
    const origin = { x: 0, y: 0 };
    let pointerId: number | null = null;

    const reset = () => {
      pointerId = null;
      drive.current.active = false;
      drive.current.throttle = 0;
      drive.current.turn = 0;
    };

    const axis = (delta: number) => {
      const sign = Math.sign(delta);
      const mag = Math.max(0, Math.abs(delta) - DEAD_ZONE) / FULL_DRAG;
      return sign * Math.min(1, mag);
    };

    const down = (e: PointerEvent) => {
      if (e.button !== 2) return;
      const target = e.target as HTMLElement | null;
      // Jangan bajak klik kanan di atas panel UI/overlay.
      if (target && target.closest("[data-ui-panel]")) return;
      pointerId = e.pointerId;
      origin.x = e.clientX;
      origin.y = e.clientY;
      drive.current.active = true;
      e.preventDefault();
    };

    const move = (e: PointerEvent) => {
      if (pointerId === null || e.pointerId !== pointerId) return;
      drive.current.throttle = -axis(e.clientY - origin.y);
      drive.current.turn = -axis(e.clientX - origin.x);
    };

    const up = (e: PointerEvent) => {
      if (pointerId !== null && e.pointerId !== pointerId) return;
      reset();
    };

    const context = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest("[data-ui-panel]")) return;
      e.preventDefault();
    };

    window.addEventListener("pointerdown", down);
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    window.addEventListener("blur", reset);
    window.addEventListener("contextmenu", context);
    return () => {
      window.removeEventListener("pointerdown", down);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
      window.removeEventListener("blur", reset);
      window.removeEventListener("contextmenu", context);
    };
  }, []);

  return drive;
}
