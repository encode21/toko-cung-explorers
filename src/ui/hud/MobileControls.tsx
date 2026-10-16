import { useMobility, releaseCarry } from "@/game/mobility/store";
import { connectionId } from "@/net/channel-store";
import { fishingAction, useFishing } from "@/game/fishing/store";
import { useFishingPhase } from "@/game/fishing/use-fishing-phase";
import { useCameraZoom } from "@/game/player/camera-zoom";
import { useGameUi } from "@/state/game-ui-store";
import { useEffect, useRef, useState } from "react";
import { ArrowBigUp, HandFist, Fish } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  addTouchLook,
  resetTouchDrive,
  resetTouchMove,
  setTouchMove,
  useTouchDrive,
} from "@/game/player/touch-drive";
import { useControls } from "@/game/player/control-state";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useTouchControls } from "@/hooks/use-touch";
import "./mobile-controls.css";

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
  const flying = useMobility((s) => s.flying);
  const carried = useMobility((s) =>
    s.carries.some((p) => p.status === "active" && p.passenger === connectionId),
  );
  const fishing = useFishing((s) => s.open);
  const fishingBusy = useFishing((s) => s.busy);
  const { phase, revealing } = useFishingPhase();
  const lookTouches = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef(0);
  const base = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const movePointer = useRef<number | null>(null);
  const lookPointer = useRef<number | null>(null);
  const lookStart = useRef({ x: 0, y: 0, distance: 0 });
  const lookLast = useRef({ x: 0, y: 0 });
  const [moving, setMoving] = useState(false);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const moveActive = useTouchDrive((s) => s.active);
  const overlay = useGame((state) => state.overlay);
  const nearby = useGame((state) => state.nearby);
  const sheet = useHud((state) => state.sheet);
  const principalPanel = useHud((s) => s.principalPanel);
  const playerReady = useControls((state) => state.playerReady);
  const touch = useTouchControls();
  const blocked = useGameUi((s) => s.portrait || s.panels > 0);

  const gameplayReady =
    touch &&
    !blocked &&
    playerReady &&
    overlay === "none" &&
    sheet === null &&
    principalPanel === null;

  useEffect(() => {
    if (!gameplayReady) {
      lookTouches.current.clear();
      pinchDistance.current = 0;
      movePointer.current = null;
      setMoving(false);
      setOrigin(null);
      lookPointer.current = null;
      setKnob({ x: 0, y: 0 });
      resetTouchDrive();
    }
  }, [gameplayReady]);

  useEffect(() => () => resetTouchDrive(), []);

  useEffect(() => {
    if (!gameplayReady) return;

    const onMove = (event: PointerEvent) => {
      if (lookTouches.current.has(event.pointerId)) {
        lookTouches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        if (lookTouches.current.size === 2) {
          const [a, b] = [...lookTouches.current.values()];
          if (!a || !b) return;
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          if (pinchDistance.current > 8 && distance > 8)
            useCameraZoom.getState().adjust(pinchDistance.current / distance);
          pinchDistance.current = distance;
          return;
        }
      }
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
        lookStart.current.distance +=
          Math.abs(event.clientX - lookLast.current.x) +
          Math.abs(event.clientY - lookLast.current.y);
        const dx = (event.clientX - lookLast.current.x) * LOOK_GAIN;
        const dy = (event.clientY - lookLast.current.y) * LOOK_GAIN;
        lookLast.current = { x: event.clientX, y: event.clientY };
        if (dx !== 0 || dy !== 0) addTouchLook(dx, dy);
      }
    };

    const onUp = (event: PointerEvent) => {
      lookTouches.current.delete(event.pointerId);
      pinchDistance.current = 0;
      if (lookTouches.current.size === 1) {
        const remaining = lookTouches.current.entries().next().value;
        if (!remaining) return;
        const [id, point] = remaining;
        lookPointer.current = id;
        lookLast.current = point;
        lookStart.current.distance = Infinity;
      }
      if (movePointer.current === event.pointerId) {
        movePointer.current = null;
        setMoving(false);
        setOrigin(null);
        setKnob({ x: 0, y: 0 });
        resetTouchMove();
      }
      if (lookPointer.current === event.pointerId) {
        if (event.type === "pointerup" && lookStart.current.distance < 8)
          window.dispatchEvent(
            new CustomEvent("game-player-tap", { detail: { x: event.clientX, y: event.clientY } }),
          );
        lookPointer.current = null;
        useTouchDrive.getState().resetLook();
      }
    };

    const reset = () => {
      // Jangan reset saat jari masih di joystick/look — visualViewport resize iOS
      // sering memicu event ini dan memutus gerak.
      if (movePointer.current !== null || lookPointer.current !== null) return;
      setOrigin(null);
      setKnob({ x: 0, y: 0 });
      resetTouchDrive();
    };
    const onBlur = () => {
      lookTouches.current.clear();
      pinchDistance.current = 0;
      movePointer.current = null;
      lookPointer.current = null;
      setMoving(false);
      reset();
    };
    window.addEventListener("blur", onBlur);
    window.visualViewport?.addEventListener("resize", reset);
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      window.removeEventListener("blur", onBlur);
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
        className="mmo-touch-look pointer-events-auto absolute top-[calc(env(safe-area-inset-top)+3.75rem)] right-0 z-[15] w-[55%] touch-none"
        aria-label="Geser untuk melihat sekeliling; cubit dua jari untuk zoom"
        data-mobile-look
        onPointerDown={(event) => {
          if (event.pointerType !== "touch" || lookTouches.current.size >= 2) return;
          if (movePointer.current === event.pointerId) return;
          if (isBlockingUi(event.target)) return;
          lookTouches.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
          if (lookTouches.current.size === 2) {
            const [a, b] = [...lookTouches.current.values()];
            if (!a || !b) return;
            pinchDistance.current = Math.hypot(a.x - b.x, a.y - b.y);
            lookStart.current.distance = Infinity;
            useTouchDrive.getState().resetLook();
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
            return;
          }
          lookPointer.current = event.pointerId;
          lookStart.current = { x: event.clientX, y: event.clientY, distance: 0 };
          lookLast.current = { x: event.clientX, y: event.clientY };
          event.currentTarget.setPointerCapture(event.pointerId);
          event.preventDefault();
        }}
      />

      <div
        className="mmo-touch-controls pointer-events-none absolute inset-0 z-[30]"
        aria-label="Kontrol sentuh"
      >
        <div
          data-mobile-move-zone
          className="pointer-events-auto absolute left-0 w-[44%] touch-none"
          onPointerDown={(event) => {
            if (
              movePointer.current !== null ||
              lookPointer.current === event.pointerId ||
              isBlockingUi(event.target)
            )
              return;
            const rect = event.currentTarget.getBoundingClientRect();
            const restingBounds = base.current?.getBoundingClientRect();
            // Reserve room for the expanded ring; short landscape zones center it vertically.
            const margin = Math.max(RADIUS + 4, (base.current?.offsetWidth ?? 108) * 0.75);
            const leftInset = restingBounds
              ? restingBounds.left + restingBounds.width / 2 - rect.left
              : margin;
            const place = (point: number, extent: number) =>
              extent < margin * 2 ? extent / 2 : Math.max(margin, Math.min(extent - margin, point));
            setOrigin({
              x: Math.max(leftInset, place(event.clientX - rect.left, rect.width)),
              y: place(event.clientY - rect.top, rect.height),
            });
            movePointer.current = event.pointerId;
            setMoving(true);
            setKnob({ x: 0, y: 0 });
            setTouchMove(0, 0);
            event.currentTarget.setPointerCapture(event.pointerId);
            event.preventDefault();
          }}
          aria-label="Area analog gerak"
        >
          <div
            ref={base}
            data-mobile-joystick
            data-active={moving}
            data-moving={moving && moveActive}
            className="pointer-events-none absolute size-[6.75rem] touch-none rounded-full mmo-joystick"
            style={
              origin
                ? { left: origin.x, top: origin.y, transform: "translate(-50%, -50%)" }
                : {
                    left: "max(calc(36.36% - 12px), calc(env(safe-area-inset-left, 0px) + var(--mobile-joystick-rest-left, 140px)))",
                    top: "50%",
                    transform: "translate(-50%, -50%)",
                  }
            }
            aria-label="Analog gerak"
          >
            <div className="mmo-joystick-disc" aria-hidden>
              <svg className="mmo-joystick-ring" viewBox="0 0 120 120" aria-hidden>
                <circle className="mmo-joystick-rim" cx="60" cy="60" r="52" />
                <g className="mmo-joystick-cardinals">
                  <path d="M60 16 52 27 68 27Z" />
                  <path d="M104 60 93 52 93 68Z" />
                  <path d="M60 104 52 93 68 93Z" />
                  <path d="M16 60 27 52 27 68Z" />
                </g>
                <g
                  className="mmo-joystick-direction"
                  transform={`rotate(${(Math.atan2(knob.y, knob.x) * 180) / Math.PI} 60 60)`}
                >
                  <circle
                    className="mmo-joystick-arc"
                    cx="60"
                    cy="60"
                    r="52"
                    pathLength="360"
                    strokeDasharray="84 276"
                    transform="rotate(-42 60 60)"
                  />
                  <path className="mmo-joystick-tip" d="M117 60 108 54 108 66Z" />
                </g>
              </svg>
            </div>
            <div
              className="mmo-joystick-knob"
              style={{ transform: `translate(calc(-50% + ${knob.x}px), calc(-50% + ${knob.y}px))` }}
              aria-hidden
            />
          </div>
        </div>

        {nearby?.kind === "player" && (
          <button
            type="button"
            className="punch-trigger"
            data-mobile-interact
            data-mobile-punch
            data-hud-control
            data-active="true"
            aria-label={`Pukul ${nearby.label}`}
            onPointerDown={(event) => {
              event.preventDefault();
              useGame.getState().socialAct("punch");
            }}
          >
            <HandFist className="punch-trigger-icon" aria-hidden />
          </button>
        )}
        <Button
          type="button"
          size="icon"
          data-mobile-interact
          onClick={() => {
            if (carried) releaseCarry();
            else if (flying) return;
            else if (fishing) void fishingAction();
            else useControls.getState().queueJump();
          }}
          onPointerDown={(e) => {
            if (flying) {
              e.currentTarget.setPointerCapture(e.pointerId);
              useMobility.setState({ vertical: 1 });
            }
          }}
          onPointerUp={() => {
            if (flying) useMobility.setState({ vertical: 0 });
          }}
          onPointerCancel={() => useMobility.setState({ vertical: 0 })}
          onLostPointerCapture={() => useMobility.setState({ vertical: 0 })}
          disabled={fishing && (fishingBusy || revealing)}
          data-mobile-primary-action
          data-mobile-jump={(!fishing && !flying && !carried) || undefined}
          data-mobile-fishing={fishing || undefined}
          data-fishing-bite={(fishing && phase === "bite" && !fishingBusy) || undefined}
          aria-label={
            carried
              ? "Turun dari gendongan"
              : flying
                ? "Terbang naik"
                : fishing
                  ? phase === "waiting" || phase === "bite"
                    ? "Tarik kail"
                    : "Lempar kail"
                  : "Loncat"
          }
          className="pointer-events-auto absolute rounded-full border border-white/20 bg-slate-800/40 text-white/80 shadow-none hover:bg-slate-700/50 active:scale-95"
        >
          {carried ? (
            <span>Turun</span>
          ) : fishing ? (
            <>
              <Fish aria-hidden />
              <span>
                {revealing
                  ? "Dapat!"
                  : fishingBusy
                    ? "Tunggu…"
                    : phase === "waiting" || phase === "bite"
                      ? "Tarik kail"
                      : "Lempar kail"}
              </span>
            </>
          ) : (
            <ArrowBigUp fill="currentColor" strokeWidth={1} aria-hidden />
          )}
        </Button>
      </div>
    </>
  );
}
