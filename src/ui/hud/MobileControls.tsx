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

function isBlockingUi(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(
      "[data-ui-panel],[data-hud-control],[data-mobile-joystick],[data-mobile-interact]",
    ),
  );
}

function touchById(list: TouchList, id: number) {
  for (let i = 0; i < list.length; i++) {
    const t = list.item(i);
    if (t && t.identifier === id) return t;
  }
  return null;
}

/**
 * Multitouch move + jump must use native TouchEvent with `{ passive: false }`.
 * React pointer handlers + setPointerCapture often cancel the stick when a second
 * finger hits jump on iOS/Android WebViews.
 */
export function MobileControls() {
  const flying = useMobility((s) => s.flying);
  const carried = useMobility((s) =>
    s.carries.some((p) => p.status === "active" && p.passenger === connectionId),
  );
  const fishing = useFishing((s) => s.open);
  const fishingBusy = useFishing((s) => s.busy);
  const { phase, revealing } = useFishingPhase();
  const moveZone = useRef<HTMLDivElement>(null);
  const jumpBtn = useRef<HTMLButtonElement>(null);
  const lookZone = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const knobEl = useRef<HTMLDivElement>(null);
  const originRef = useRef<{ x: number; y: number } | null>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const moveTouch = useRef<number | null>(null);
  const lookTouch = useRef<number | null>(null);
  const flyTouch = useRef<number | null>(null);
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
  const blocked = useGameUi((s) => s.portrait || s.panels > 0);
  const jumpDisabled = fishing && (fishingBusy || revealing);
  const actionRef = useRef({ flying, carried, fishing, jumpDisabled });
  actionRef.current = { flying, carried, fishing, jumpDisabled };

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

  useEffect(() => {
    if (!gameplayReady) {
      moveTouch.current = null;
      lookTouch.current = null;
      flyTouch.current = null;
      originRef.current = null;
      setMoving(false);
      setOrigin(null);
      if (knobEl.current) knobEl.current.style.transform = "translate(-50%, -50%)";
      resetTouchDrive();
    }
  }, [gameplayReady]);

  useEffect(() => () => resetTouchDrive(), []);

  useEffect(() => {
    if (!gameplayReady) return;
    const zone = moveZone.current;
    const jump = jumpBtn.current;
    const look = lookZone.current;
    if (!zone || !jump || !look) return;

    const applyStick = (clientX: number, clientY: number) => {
      const rect = base.current?.getBoundingClientRect();
      if (!rect) return;
      const rawX = clientX - (rect.left + rect.width / 2);
      const rawY = clientY - (rect.top + rect.height / 2);
      const length = Math.hypot(rawX, rawY);
      const scale = length > RADIUS ? RADIUS / length : 1;
      const x = rawX * scale;
      const y = rawY * scale;
      if (knobEl.current)
        knobEl.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
      setTouchMove(x / RADIUS, y / RADIUS);
    };

    const clearStick = () => {
      moveTouch.current = null;
      originRef.current = null;
      setMoving(false);
      setOrigin(null);
      if (knobEl.current) knobEl.current.style.transform = "translate(-50%, -50%)";
      resetTouchMove();
    };

    const startStick = (t: Touch) => {
      if (moveTouch.current !== null) return;
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
      originRef.current = next;
      moveTouch.current = t.identifier;
      setOrigin(next);
      setMoving(true);
      if (knobEl.current) knobEl.current.style.transform = "translate(-50%, -50%)";
      setTouchMove(0, 0);
    };

    const primaryAction = () => {
      const a = actionRef.current;
      if (a.carried) releaseCarry();
      else if (a.flying) return;
      else if (a.fishing) void fishingAction();
      else useControls.getState().queueJump();
    };

    const onZoneStart = (event: TouchEvent) => {
      if (isBlockingUi(event.target)) return;
      for (let i = 0; i < event.changedTouches.length; i++) {
        const t = event.changedTouches.item(i);
        if (!t) continue;
        if (moveTouch.current !== null) break;
        if (lookTouch.current === t.identifier) continue;
        startStick(t);
        event.preventDefault();
      }
    };

    const onJumpStart = (event: TouchEvent) => {
      // Do not clear the stick — this finger is independent.
      event.preventDefault();
      event.stopPropagation();
      if (actionRef.current.jumpDisabled) return;
      for (let i = 0; i < event.changedTouches.length; i++) {
        const t = event.changedTouches.item(i);
        if (!t) continue;
        if (actionRef.current.flying) {
          flyTouch.current = t.identifier;
          useMobility.setState({ vertical: 1 });
          continue;
        }
        primaryAction();
      }
    };

    const onLookStart = (event: TouchEvent) => {
      if (isBlockingUi(event.target)) return;
      for (let i = 0; i < event.changedTouches.length; i++) {
        const t = event.changedTouches.item(i);
        if (!t) continue;
        if (lookTouch.current !== null) continue;
        if (moveTouch.current === t.identifier) continue;
        lookTouch.current = t.identifier;
        lookStart.current = { x: t.clientX, y: t.clientY, distance: 0 };
        lookLast.current = { x: t.clientX, y: t.clientY };
        event.preventDefault();
      }
    };

    const onMove = (event: TouchEvent) => {
      let used = false;
      if (moveTouch.current !== null) {
        const t = touchById(event.touches, moveTouch.current);
        if (t) {
          applyStick(t.clientX, t.clientY);
          used = true;
        }
      }
      if (lookTouch.current !== null) {
        const t = touchById(event.touches, lookTouch.current);
        if (t) {
          lookStart.current.distance +=
            Math.abs(t.clientX - lookLast.current.x) + Math.abs(t.clientY - lookLast.current.y);
          const dx = (t.clientX - lookLast.current.x) * LOOK_GAIN;
          const dy = (t.clientY - lookLast.current.y) * LOOK_GAIN;
          lookLast.current = { x: t.clientX, y: t.clientY };
          if (dx !== 0 || dy !== 0) addTouchLook(dx, dy);
          used = true;
        }
      }
      if (used) event.preventDefault();
    };

    const onEnd = (event: TouchEvent) => {
      for (let i = 0; i < event.changedTouches.length; i++) {
        const t = event.changedTouches.item(i);
        if (!t) continue;
        if (flyTouch.current === t.identifier) {
          flyTouch.current = null;
          useMobility.setState({ vertical: 0 });
        }
        if (moveTouch.current === t.identifier) clearStick();
        if (lookTouch.current === t.identifier) {
          if (event.type === "touchend" && lookStart.current.distance < 8)
            window.dispatchEvent(
              new CustomEvent("game-player-tap", { detail: { x: t.clientX, y: t.clientY } }),
            );
          lookTouch.current = null;
          useTouchDrive.getState().resetLook();
        }
      }
    };

    const opts: AddEventListenerOptions = { passive: false };
    zone.addEventListener("touchstart", onZoneStart, opts);
    jump.addEventListener("touchstart", onJumpStart, opts);
    look.addEventListener("touchstart", onLookStart, opts);
    window.addEventListener("touchmove", onMove, opts);
    window.addEventListener("touchend", onEnd, opts);
    window.addEventListener("touchcancel", onEnd, opts);

    const resetIdle = () => {
      if (moveTouch.current !== null || lookTouch.current !== null) return;
      originRef.current = null;
      setOrigin(null);
      if (knobEl.current) knobEl.current.style.transform = "translate(-50%, -50%)";
      resetTouchDrive();
    };
    const onBlur = () => {
      clearStick();
      lookTouch.current = null;
      flyTouch.current = null;
      useMobility.setState({ vertical: 0 });
      resetIdle();
    };
    window.addEventListener("blur", onBlur);
    window.visualViewport?.addEventListener("resize", resetIdle);

    return () => {
      zone.removeEventListener("touchstart", onZoneStart);
      jump.removeEventListener("touchstart", onJumpStart);
      look.removeEventListener("touchstart", onLookStart);
      window.removeEventListener("touchmove", onMove);
      window.removeEventListener("touchend", onEnd);
      window.removeEventListener("touchcancel", onEnd);
      window.removeEventListener("blur", onBlur);
      window.visualViewport?.removeEventListener("resize", resetIdle);
    };
  }, [gameplayReady]);

  if (!gameplayReady) return null;

  return (
    <>
      <div
        ref={lookZone}
        className="mmo-touch-look pointer-events-auto absolute top-[calc(env(safe-area-inset-top)+3.75rem)] right-0 z-[15] w-[55%] touch-none"
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
          className="pointer-events-auto absolute left-0 w-[44%] touch-none"
          aria-label="Area analog gerak"
          onPointerDown={(event) => {
            // Mouse / pen fallback for desktop testing — phones use native touch listeners.
            if (event.pointerType === "touch") return;
            if (moveTouch.current !== null || isBlockingUi(event.target)) return;
            const fake = {
              identifier: event.pointerId,
              clientX: event.clientX,
              clientY: event.clientY,
            } as Touch;
            const rect = event.currentTarget.getBoundingClientRect();
            const restingBounds = base.current?.getBoundingClientRect();
            const margin = Math.max(RADIUS + 4, (base.current?.offsetWidth ?? 108) * 0.75);
            const leftInset = restingBounds
              ? restingBounds.left + restingBounds.width / 2 - rect.left
              : margin;
            const place = (point: number, extent: number) =>
              extent < margin * 2 ? extent / 2 : Math.max(margin, Math.min(extent - margin, point));
            const next = {
              x: Math.max(leftInset, place(fake.clientX - rect.left, rect.width)),
              y: place(fake.clientY - rect.top, rect.height),
            };
            originRef.current = next;
            moveTouch.current = fake.identifier;
            setOrigin(next);
            setMoving(true);
            setTouchMove(0, 0);
            const onMove = (e: PointerEvent) => {
              if (moveTouch.current !== e.pointerId) return;
              const stick = base.current?.getBoundingClientRect();
              if (!stick) return;
              const rawX = e.clientX - (stick.left + stick.width / 2);
              const rawY = e.clientY - (stick.top + stick.height / 2);
              const length = Math.hypot(rawX, rawY);
              const scale = length > RADIUS ? RADIUS / length : 1;
              const x = rawX * scale;
              const y = rawY * scale;
              if (knobEl.current)
                knobEl.current.style.transform = `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`;
              setTouchMove(x / RADIUS, y / RADIUS);
            };
            const onUp = (e: PointerEvent) => {
              if (moveTouch.current !== e.pointerId) return;
              moveTouch.current = null;
              originRef.current = null;
              setMoving(false);
              setOrigin(null);
              if (knobEl.current) knobEl.current.style.transform = "translate(-50%, -50%)";
              resetTouchMove();
              window.removeEventListener("pointermove", onMove);
              window.removeEventListener("pointerup", onUp);
              window.removeEventListener("pointercancel", onUp);
            };
            window.addEventListener("pointermove", onMove);
            window.addEventListener("pointerup", onUp);
            window.addEventListener("pointercancel", onUp);
            event.preventDefault();
          }}
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
            <div ref={knobEl} className="mmo-joystick-knob" style={{ transform: "translate(-50%, -50%)" }} aria-hidden />
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
            onTouchStart={(event) => {
              event.preventDefault();
              event.stopPropagation();
              useGame.getState().socialAct("punch");
            }}
          >
            <HandFist className="punch-trigger-icon" aria-hidden />
          </button>
        )}
        <button
          ref={jumpBtn}
          type="button"
          disabled={jumpDisabled}
          data-mobile-interact
          data-mobile-jump-btn
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
          onPointerDown={(event) => {
            if (event.pointerType === "touch") return;
            if (event.button !== 0) return;
            event.preventDefault();
            if (flying) {
              useMobility.setState({ vertical: 1 });
              return;
            }
            if (carried) releaseCarry();
            else if (fishing) void fishingAction();
            else useControls.getState().queueJump();
          }}
          onPointerUp={(event) => {
            if (event.pointerType !== "touch" && flying) useMobility.setState({ vertical: 0 });
          }}
          className="pointer-events-auto absolute inline-flex items-center justify-center rounded-full border border-white/20 bg-slate-800/40 text-white/80 shadow-none active:scale-95 touch-none disabled:pointer-events-none disabled:opacity-50"
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
        </button>
      </div>
    </>
  );
}
