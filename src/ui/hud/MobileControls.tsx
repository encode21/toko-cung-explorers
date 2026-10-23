import { useMissions } from "@/game/missions/store";
import { playerId } from "@/net/useWorldChannel";
import { useContextAction } from "@/hooks/use-context-action";
import { useMobility, releaseCarry } from "@/game/mobility/store";
import { connectionId } from "@/net/channel-store";
import { fishingAction, useFishing } from "@/game/fishing/store";
import { useFishingPhase } from "@/game/fishing/use-fishing-phase";
import { useCameraZoom } from "@/game/player/camera-zoom";
import { useGameUi } from "@/state/game-ui-store";
import { useEffect, useRef, useState } from "react";
import { ArrowBigUp, HandFist, Fish } from "lucide-react";
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

function inRect(x: number, y: number, r: DOMRect | undefined, pad = 0) {
  if (!r) return false;
  return x >= r.left - pad && x <= r.right + pad && y >= r.top - pad && y <= r.bottom + pad;
}

function touchById(list: TouchList, id: number) {
  for (let i = 0; i < list.length; i++) {
    const t = list.item(i);
    if (t && t.identifier === id) return t;
  }
  return null;
}

/**
 * PWA (iOS/Android standalone): all gameplay fingers must land on ONE element.
 * Window-level listeners often drop the 2nd finger; a fullscreen surface keeps both.
 */
export function MobileControls() {
  const drivingTruck = useMissions((s) => s.session.active?.truck?.driver === playerId);
  const flying = useMobility((s) => s.flying);
  const carried = useMobility((s) =>
    s.carries.some((p) => p.status === "active" && p.passenger === connectionId),
  );
  const fishing = useFishing((s) => s.open);
  const fishingBusy = useFishing((s) => s.busy);
  const { phase, revealing } = useFishingPhase();
  const surface = useRef<HTMLDivElement>(null);
  const moveZone = useRef<HTMLDivElement>(null);
  const jumpBtn = useRef<HTMLDivElement>(null);
  const punchBtn = useRef<HTMLButtonElement>(null);
  const lookZone = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const knobEl = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const moveId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const flyId = useRef<number | null>(null);
  const brakeId = useRef<number | null>(null);
  const pinchId = useRef<number | null>(null);
  const pinchLast = useRef(0);
  const lookStart = useRef({ x: 0, y: 0, distance: 0 });
  const lookLast = useRef({ x: 0, y: 0 });
  const [moving, setMoving] = useState(false);
  const moveActive = useTouchDrive((s) => s.active);
  const overlay = useGame((state) => state.overlay);
  const nearby = useGame((state) => state.nearby);
  const sheet = useHud((state) => state.sheet);
  const principalPanel = useHud((s) => s.principalPanel);
  const playerReady = useControls((state) => state.playerReady);
  const touch = useTouchControls();
  const contextAction = useContextAction();
  const blocked = useGameUi((s) => s.portrait || s.panels > 0);
  const jumpDisabled = fishing && (fishingBusy || revealing);
  const actionRef = useRef({ drivingTruck, flying, carried, fishing, jumpDisabled, nearby });
  actionRef.current = { drivingTruck, flying, carried, fishing, jumpDisabled, nearby };

  const gameplayReady =
    touch &&
    !blocked &&
    playerReady &&
    overlay === "none" &&
    sheet === null &&
    principalPanel === null;

  useEffect(() => {
    useCameraZoom.setState({ distance: 1 });
  }, []);

  // PWA: lock page gestures so a 2nd finger is a game touch, not browser zoom/scroll.
  useEffect(() => {
    if (!gameplayReady) return;
    const root = document.documentElement;
    const body = document.body;
    root.classList.add("game-touch-lock");
    body.classList.add("game-touch-lock");
    const blockGesture = (event: Event) => event.preventDefault();
    document.addEventListener("gesturestart", blockGesture, { passive: false });
    document.addEventListener("gesturechange", blockGesture, { passive: false });
    document.addEventListener("gestureend", blockGesture, { passive: false });
    return () => {
      root.classList.remove("game-touch-lock");
      body.classList.remove("game-touch-lock");
      document.removeEventListener("gesturestart", blockGesture);
      document.removeEventListener("gesturechange", blockGesture);
      document.removeEventListener("gestureend", blockGesture);
    };
  }, [gameplayReady]);

  useEffect(() => {
    if (gameplayReady) return;
    moveId.current = null;
    lookId.current = null;
    pinchId.current = null;
    flyId.current = null;
    brakeId.current = null;
    useControls.getState().setTruckBrakeHeld(false);
    setMoving(false);
    setOrigin(null);
    if (knobEl.current) knobEl.current.style.transform = "translate(-50%, -50%)";
    resetTouchDrive();
  }, [gameplayReady]);

  useEffect(
    () => () => {
      resetTouchDrive();
      useControls.getState().setTruckBrakeHeld(false);
    },
    [],
  );
  useEffect(() => {
    if (drivingTruck) return;
    brakeId.current = null;
    useControls.getState().setTruckBrakeHeld(false);
    if (jumpBtn.current) delete jumpBtn.current.dataset["pressed"];
  }, [drivingTruck]);

  useEffect(() => {
    if (!gameplayReady) return;
    const el = surface.current;
    if (!el) return;

    const applyStick = (clientX: number, clientY: number) => {
      const rect = base.current?.getBoundingClientRect();
      if (!rect) return;
      const rawX = clientX - (rect.left + rect.width / 2);
      const rawY = clientY - (rect.top + rect.height / 2);
      const length = Math.hypot(rawX, rawY) || 1;
      const scale = length > RADIUS ? RADIUS / length : 1;
      const x = rawX * scale;
      const y = rawY * scale;
      if (knobEl.current)
        knobEl.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      setTouchMove(x / RADIUS, y / RADIUS);
    };

    const clearStick = () => {
      moveId.current = null;
      setMoving(false);
      setOrigin(null);
      if (knobEl.current) knobEl.current.style.transform = "translate(-50%, -50%)";
      resetTouchMove();
    };

    const startStick = (t: Touch) => {
      const zone = moveZone.current;
      if (!zone || moveId.current !== null) return;
      const rect = zone.getBoundingClientRect();
      const restingBounds = base.current?.getBoundingClientRect();
      const margin = Math.max(RADIUS + 4, (base.current?.offsetWidth ?? 108) * 0.75);
      const leftInset = restingBounds
        ? restingBounds.left + restingBounds.width / 2 - rect.left
        : margin;
      const place = (point: number, extent: number) =>
        extent < margin * 2 ? extent / 2 : Math.max(margin, Math.min(extent - margin, point));
      const next = {
        x: Math.max(leftInset, place(t.clientX - rect.left, rect.width)),
        y: place(t.clientY - rect.top, rect.height),
      };
      moveId.current = t.identifier;
      setOrigin(next);
      setMoving(true);
      if (knobEl.current) knobEl.current.style.transform = "translate(-50%, -50%)";
      setTouchMove(0, 0);
      applyStick(t.clientX, t.clientY);
    };

    const fireJump = () => {
      const a = actionRef.current;
      if (a.jumpDisabled) return;
      if (a.carried) {
        releaseCarry();
        return;
      }
      if (a.flying) return;
      if (a.fishing) {
        void fishingAction();
        return;
      }
      useControls.getState().queueJump();
    };

    const onStart = (event: TouchEvent) => {
      // Always preventDefault on the surface so iOS PWA keeps delivering multitouch.
      event.preventDefault();
      for (let i = 0; i < event.changedTouches.length; i++) {
        const t = event.changedTouches.item(i);
        if (!t) continue;
        if (
          t.identifier === moveId.current ||
          t.identifier === lookId.current ||
          t.identifier === pinchId.current ||
          t.identifier === flyId.current ||
          t.identifier === brakeId.current
        )
          continue;

        const jumpRect = jumpBtn.current?.getBoundingClientRect();
        const punchRect = punchBtn.current?.getBoundingClientRect();
        const moveRect = moveZone.current?.getBoundingClientRect();
        const lookRect = lookZone.current?.getBoundingClientRect();

        if (inRect(t.clientX, t.clientY, jumpRect, 16)) {
          const button = jumpBtn.current;
          if (button) {
            button.dataset["pressed"] = "true";
            if (!actionRef.current.drivingTruck)
              window.setTimeout(() => delete button.dataset["pressed"], 140);
          }
          if (actionRef.current.drivingTruck) {
            brakeId.current = t.identifier;
            useControls.getState().setTruckBrakeHeld(true);
            useControls.getState().queueJump();
          } else if (actionRef.current.flying) {
            flyId.current = t.identifier;
            useMobility.setState({ vertical: 1 });
          } else {
            fireJump();
          }
          continue;
        }

        if (inRect(t.clientX, t.clientY, punchRect, 8)) {
          if (actionRef.current.nearby?.kind === "player") useGame.getState().socialAct("punch");
          continue;
        }

        if (inRect(t.clientX, t.clientY, moveRect, 0)) {
          startStick(t);
          continue;
        }

        // Right-side look, or any free area that isn't left stick.
        const lookArea =
          inRect(t.clientX, t.clientY, lookRect, 0) ||
          (moveRect ? t.clientX > moveRect.right : t.clientX > window.innerWidth * 0.45);
        if (!lookArea) continue;
        if (lookId.current === null) {
          lookId.current = t.identifier;
          lookStart.current = { x: t.clientX, y: t.clientY, distance: 0 };
          lookLast.current = { x: t.clientX, y: t.clientY };
        } else if (pinchId.current === null) {
          // Second right-side finger turns the look gesture into pinch zoom.
          pinchId.current = t.identifier;
          pinchLast.current = Math.hypot(
            t.clientX - lookLast.current.x,
            t.clientY - lookLast.current.y,
          );
          lookStart.current.distance = Infinity;
          useTouchDrive.getState().resetLook();
        }
      }
    };

    const onMove = (event: TouchEvent) => {
      event.preventDefault();
      if (moveId.current !== null) {
        const t = touchById(event.touches, moveId.current);
        if (t) applyStick(t.clientX, t.clientY);
      }
      if (lookId.current !== null && pinchId.current !== null) {
        const a = touchById(event.touches, lookId.current);
        const b = touchById(event.touches, pinchId.current);
        if (a && b) {
          const distance = Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
          // Fingers apart = closer camera (smaller distance multiplier).
          if (pinchLast.current > 8 && distance > 8)
            useCameraZoom.getState().adjust(pinchLast.current / distance);
          pinchLast.current = distance;
          lookLast.current = { x: a.clientX, y: a.clientY };
        }
      } else if (lookId.current !== null) {
        const t = touchById(event.touches, lookId.current);
        if (t) {
          lookStart.current.distance +=
            Math.abs(t.clientX - lookLast.current.x) + Math.abs(t.clientY - lookLast.current.y);
          const dx = (t.clientX - lookLast.current.x) * LOOK_GAIN;
          const dy = (t.clientY - lookLast.current.y) * LOOK_GAIN;
          lookLast.current = { x: t.clientX, y: t.clientY };
          if (dx !== 0 || dy !== 0) addTouchLook(dx, dy);
        }
      }
    };

    const onEnd = (event: TouchEvent) => {
      for (let i = 0; i < event.changedTouches.length; i++) {
        const t = event.changedTouches.item(i);
        if (!t) continue;
        if (brakeId.current === t.identifier) {
          brakeId.current = null;
          useControls.getState().setTruckBrakeHeld(false);
          if (jumpBtn.current) delete jumpBtn.current.dataset["pressed"];
        }
        if (flyId.current === t.identifier) {
          flyId.current = null;
          useMobility.setState({ vertical: 0 });
        }
        if (moveId.current === t.identifier) clearStick();
        if (pinchId.current === t.identifier) {
          // Remaining look finger continues as a drag from its current point.
          pinchId.current = null;
          const look = lookId.current === null ? null : touchById(event.touches, lookId.current);
          if (look) lookLast.current = { x: look.clientX, y: look.clientY };
        } else if (lookId.current === t.identifier && pinchId.current !== null) {
          // Promote the pinch finger to look so the gesture never gets stuck.
          lookId.current = pinchId.current;
          pinchId.current = null;
          const look = touchById(event.touches, lookId.current);
          if (look) lookLast.current = { x: look.clientX, y: look.clientY };
          continue;
        }
        if (lookId.current === t.identifier) {
          if (event.type === "touchend" && lookStart.current.distance < 8)
            window.dispatchEvent(
              new CustomEvent("game-player-tap", { detail: { x: t.clientX, y: t.clientY } }),
            );
          lookId.current = null;
          useTouchDrive.getState().resetLook();
        }
      }
    };

    const opts: AddEventListenerOptions = { passive: false };
    el.addEventListener("touchstart", onStart, opts);
    el.addEventListener("touchmove", onMove, opts);
    el.addEventListener("touchend", onEnd, opts);
    el.addEventListener("touchcancel", onEnd, opts);

    const onBlur = () => {
      clearStick();
      lookId.current = null;
      pinchId.current = null;
      flyId.current = null;
      brakeId.current = null;
      useControls.getState().setTruckBrakeHeld(false);
      if (jumpBtn.current) delete jumpBtn.current.dataset["pressed"];
      useMobility.setState({ vertical: 0 });
      resetTouchDrive();
    };
    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onBlur);

    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onBlur);
    };
  }, [gameplayReady]);

  if (!gameplayReady) return null;

  return (
    <>
      {/* Single multitouch target for iOS/Android PWA — must stay under HUD menus (z≥32). */}
      <div ref={surface} className="mmo-touch-surface" data-mobile-touch-surface aria-hidden />

      <div
        ref={lookZone}
        className="mmo-touch-look pointer-events-none absolute top-[calc(env(safe-area-inset-top)+3.75rem)] right-0 z-[15] w-[55%] touch-none"
        aria-label="Geser untuk melihat sekeliling"
        data-mobile-look
      />

      <div
        className="mmo-touch-controls pointer-events-none absolute inset-0 z-[30]"
        aria-label="Kontrol sentuh"
      >
        <div
          ref={moveZone}
          data-mobile-move-zone
          className="pointer-events-none absolute left-0 w-[44%] touch-none"
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
              </svg>
            </div>
            <div
              ref={knobEl}
              className="mmo-joystick-knob"
              style={{ transform: "translate(-50%, -50%)" }}
              aria-hidden
            />
          </div>
        </div>

        {nearby?.kind === "player" && (!contextAction || !!contextAction.anchor) && (
          <button
            ref={punchBtn}
            type="button"
            className="punch-trigger pointer-events-none"
            data-mobile-interact
            data-mobile-punch
            data-hud-control
            data-active="true"
            aria-label={`Pukul ${nearby.label}`}
            tabIndex={-1}
          >
            <HandFist className="punch-trigger-icon" aria-hidden />
          </button>
        )}
        <div
          ref={jumpBtn}
          role="button"
          tabIndex={-1}
          aria-disabled={jumpDisabled || undefined}
          data-mobile-interact
          data-mobile-jump-btn
          data-mobile-primary-action
          data-mobile-jump={(!drivingTruck && !fishing && !flying && !carried) || undefined}
          data-mobile-fishing={fishing || undefined}
          data-fishing-bite={(fishing && phase === "bite" && !fishingBusy) || undefined}
          aria-label={
            drivingTruck
              ? "Rem truk"
              : carried
                ? "Turun dari gendongan"
                : flying
                  ? "Terbang naik"
                  : fishing
                    ? phase === "waiting" || phase === "bite"
                      ? "Tarik kail"
                      : "Lempar kail"
                    : "Loncat"
          }
          className="pointer-events-none absolute z-40 inline-flex items-center justify-center rounded-full border border-white/20 bg-slate-800/40 text-white/80 shadow-none touch-none"
          style={{ opacity: jumpDisabled ? 0.5 : 1 }}
        >
          {drivingTruck ? (
            <span style={{ fontWeight: 800 }}>REM</span>
          ) : carried ? (
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
        </div>
      </div>
    </>
  );
}
