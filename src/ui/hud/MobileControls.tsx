import { useEffect, useRef, useState } from "react";
import { ChevronsUp, Hand } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addTouchLook,
  resetTouchDrive,
  resetTouchMove,
  setTouchMove,
} from "@/game/player/touch-drive";
import { useControls } from "@/game/player/control-state";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useTouchControls } from "@/hooks/use-touch";

const RADIUS = 44;
const LOOK_GAIN = 1;

function isBlockingUi(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "[data-ui-panel],[data-hud-control],[data-mobile-joystick],[data-mobile-interact]",
    ),
  );
}

export function MobileControls() {
  const base = useRef<HTMLDivElement>(null);
  const movePointer = useRef<number | null>(null);
  const lookPointer = useRef<number | null>(null);
  const lookLast = useRef({ x: 0, y: 0 });
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const nearby = useGame((state) => state.nearby);
  const overlay = useGame((state) => state.overlay);
  const interact = useGame((state) => state.interact);
  const sheet = useHud((state) => state.sheet);
  const playerReady = useControls((state) => state.playerReady);
  const touch = useTouchControls();

  const gameplayReady = touch && playerReady && overlay === "none" && sheet === null;

  // Reset hanya saat kontrol tidak siap — jangan reset di setiap cleanup Strict Mode
  // saat gameplayReady tetap true (itu menghapus input di tengah drag).
  useEffect(() => {
    if (!gameplayReady) {
      movePointer.current = null;
      lookPointer.current = null;
      setKnob({ x: 0, y: 0 });
      resetTouchDrive();
    }
  }, [gameplayReady]);

  useEffect(() => () => resetTouchDrive(), []);

  // Listener window: drag tetap terbaca meski jari keluar dari lingkaran joystick.
  useEffect(() => {
    if (!gameplayReady) return;

    const onMove = (event: PointerEvent) => {
      if (movePointer.current === event.pointerId) {
        const rect = base.current?.getBoundingClientRect();
        if (!rect) return;
        const rawX = event.clientX - (rect.left + rect.width / 2);
        const rawY = event.clientY - (rect.top + rect.height / 2);
        const length = Math.hypot(rawX, rawY);
        const scale = length > RADIUS ? RADIUS / length : 1;
        const x = rawX * scale;
        const y = rawY * scale;
        setKnob({ x, y });
        // Screen Y+ ke bawah → stick atas = maju (nilai Y negatif).
        setTouchMove(x / RADIUS, y / RADIUS);
        return;
      }
      if (lookPointer.current === event.pointerId) {
        const dx = (event.clientX - lookLast.current.x) * LOOK_GAIN;
        const dy = (event.clientY - lookLast.current.y) * LOOK_GAIN;
        lookLast.current = { x: event.clientX, y: event.clientY };
        if (dx !== 0 || dy !== 0) addTouchLook(dx, dy);
      }
    };

    const onUp = (event: PointerEvent) => {
      if (movePointer.current === event.pointerId) {
        movePointer.current = null;
        setKnob({ x: 0, y: 0 });
        resetTouchMove();
      }
      if (lookPointer.current === event.pointerId) {
        lookPointer.current = null;
      }
    };

    const reset = () => {
      movePointer.current = null;
      lookPointer.current = null;
      setKnob({ x: 0, y: 0 });
      resetTouchDrive();
    };
    window.addEventListener("blur", reset);
    window.visualViewport?.addEventListener("resize", reset);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("blur", reset);
      window.visualViewport?.removeEventListener("resize", reset);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [gameplayReady]);

  if (!gameplayReady) return null;

  return (
    <>
      <div
        className="pointer-events-auto absolute top-[calc(env(safe-area-inset-top)+4.25rem)] right-0 bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] z-[15] w-[58%] touch-none"
        aria-label="Geser untuk melihat sekeliling"
        data-mobile-look
        onPointerDown={(event) => {
          if (lookPointer.current !== null) return;
          if (movePointer.current === event.pointerId) return;
          if (isBlockingUi(event.target)) return;
          lookPointer.current = event.pointerId;
          lookLast.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
      />

      <div className="pointer-events-none absolute inset-0 z-[25]" aria-label="Kontrol sentuh">
        <div
          ref={base}
          data-mobile-joystick
          className="pointer-events-auto absolute bottom-[calc(env(safe-area-inset-bottom)+5.5rem)] left-[max(1rem,env(safe-area-inset-left))] size-[7.25rem] touch-none rounded-full hud-glass"
          onPointerDown={(event) => {
            if (lookPointer.current === event.pointerId) return;
            movePointer.current = event.pointerId;
            event.currentTarget.setPointerCapture(event.pointerId);
            const rect = base.current?.getBoundingClientRect();
            if (rect) {
              const rawX = event.clientX - (rect.left + rect.width / 2);
              const rawY = event.clientY - (rect.top + rect.height / 2);
              const length = Math.hypot(rawX, rawY);
              const scale = length > RADIUS ? RADIUS / length : 1;
              const x = rawX * scale;
              const y = rawY * scale;
              setKnob({ x, y });
              setTouchMove(x / RADIUS, y / RADIUS);
            }
            event.preventDefault();
          }}
          aria-label="Analog gerak"
        >
          <div className="absolute inset-3 rounded-full border border-world-outline" />
          <div
            className="absolute top-1/2 left-1/2 grid size-12 place-items-center rounded-full border border-world-outline bg-world-accent text-world-accent-foreground shadow-lg"
            style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
          >
            <span className="size-2 rounded-full bg-current" />
          </div>
        </div>

        <Button
          type="button"
          size="icon"
          data-mobile-interact
          onPointerDown={(event) => {
            event.preventDefault();
            useControls.getState().queueJump();
          }}
          data-mobile-jump
          aria-label="Loncat"
          className="pointer-events-auto absolute right-[max(1.25rem,env(safe-area-inset-right))] bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] size-14 rounded-full border border-world-outline bg-world-panel text-world-panel-foreground shadow-xl"
        >
          <ChevronsUp className="size-6" />
        </Button>

        {nearby && (
          <Button
            type="button"
            size="icon"
            data-mobile-interact
            onClick={interact}
            data-mobile-action
            aria-label={`Interaksi dengan ${nearby.label}`}
            className="pointer-events-auto absolute right-[max(1.25rem,env(safe-area-inset-right))] bottom-[calc(env(safe-area-inset-bottom)+10.75rem)] size-16 rounded-full border border-world-outline bg-world-brand text-world-brand-foreground shadow-xl"
          >
            <Hand className="size-6" />
          </Button>
        )}
      </div>
    </>
  );
}
