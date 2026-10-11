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
  const sitting = useGame((state) => state.sitting);
  const nearby = useGame((state) => state.nearby);
  const overlay = useGame((state) => state.overlay);
  const interact = useGame((state) => state.interact);
  const sheet = useHud((state) => state.sheet);
  const principalPanel = useHud((s) => s.principalPanel);
  const playerReady = useControls((state) => state.playerReady);
  const touch = useTouchControls();

  const gameplayReady =
    touch && playerReady && overlay === "none" && sheet === null && principalPanel === null;

  useEffect(() => {
    if (!gameplayReady) {
      movePointer.current = null;
      lookPointer.current = null;
      setKnob({ x: 0, y: 0 });
      resetTouchDrive();
    }
  }, [gameplayReady]);

  useEffect(() => () => resetTouchDrive(), []);

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
      // Jangan reset saat jari masih di joystick/look — visualViewport resize iOS
      // sering memicu event ini dan memutus gerak.
      if (movePointer.current !== null || lookPointer.current !== null) return;
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

  // ContextPanel sudah jadi interaksi utama di tengah — FAB hanya untuk aksi tunggal
  // non-player (atau berdiri). Hindari dobel Hand + fist yang tabrakan.
  const showAction = !!nearby && (sitting || nearby.kind !== "player");

  return (
    <>
      <div
        className="pointer-events-auto absolute top-[calc(env(safe-area-inset-top)+3.75rem)] right-0 bottom-[calc(var(--dock-clearance,4.5rem)+0.75rem)] z-[15] w-[55%] touch-none"
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

      <div className="pointer-events-none absolute inset-0 z-[30]" aria-label="Kontrol sentuh">
        <div
          ref={base}
          data-mobile-joystick
          className="pointer-events-auto absolute bottom-[calc(var(--dock-clearance,4.5rem)+1.25rem)] left-[max(0.75rem,env(safe-area-inset-left))] size-[6.75rem] touch-none rounded-full hud-glass"
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
            className="absolute top-1/2 left-1/2 grid size-11 place-items-center rounded-full border border-world-outline bg-world-accent text-world-accent-foreground shadow-md"
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
          disabled={sitting}
          aria-label="Loncat"
          className="pointer-events-auto absolute right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--dock-clearance,4.5rem)+1.25rem)] size-12 rounded-full border border-world-outline bg-world-panel text-world-panel-foreground shadow-lg"
        >
          <ChevronsUp className="size-5" />
        </Button>

        {showAction && (
          <Button
            type="button"
            size="icon"
            data-mobile-interact
            onClick={interact}
            data-mobile-action
            aria-label={sitting ? "Berdiri" : `Interaksi dengan ${nearby.label}`}
            className="pointer-events-auto absolute right-[max(1rem,env(safe-area-inset-right))] bottom-[calc(var(--dock-clearance,4.5rem)+5rem)] size-14 rounded-full active:scale-95 border border-world-outline bg-world-brand text-world-brand-foreground shadow-lg"
          >
            {sitting ? (
              <span className="text-[10px] font-semibold">Berdiri</span>
            ) : (
              <Hand className="size-6" />
            )}
          </Button>
        )}
      </div>
    </>
  );
}
