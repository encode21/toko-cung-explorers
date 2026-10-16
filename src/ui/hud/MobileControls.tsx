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
 * Document-level multitouch router.
 * Stick and jump are separate touch.identifiers; jump is hit-tested by rect
 * (not a focusable button) so a second finger cannot cancel the stick.
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
  const jumpBtn = useRef<HTMLDivElement>(null);
  const punchBtn = useRef<HTMLButtonElement>(null);
  const lookZone = useRef<HTMLDivElement>(null);
  const base = useRef<HTMLDivElement>(null);
  const knobEl = useRef<HTMLDivElement>(null);
  const [origin, setOrigin] = useState<{ x: number; y: number } | null>(null);
  const moveId = useRef<number | null>(null);
  const lookId = useRef<number | null>(null);
  const flyId = useRef<number | null>(null);
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
  const actionRef = useRef({ flying, carried, fishing, jumpDisabled, nearby });
  actionRef.current = { flying, carried, fishing, jumpDisabled, nearby };

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
    if (gameplayReady) return;
    moveId.current = null;
    lookId.current = null;
    flyId.current = null;
    setMoving(false);
    setOrigin(null);
    if (knobEl.current) knobEl.current.style.transform = "translate(-50%, -50%)";
    resetTouchDrive();
  }, [gameplayReady]);

  useEffect(() => () => resetTouchDrive(), []);

  useEffect(() => {
    if (!gameplayReady) return;

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
      let claimed = false;
      for (let i = 0; i < event.changedTouches.length; i++) {
        const t = event.changedTouches.item(i);
        if (!t) continue;
        // Already tracked fingers keep their role.
        if (
          t.identifier === moveId.current ||
          t.identifier === lookId.current ||
          t.identifier === flyId.current
        ) {
          claimed = true;
          continue;
        }

        const jumpRect = jumpBtn.current?.getBoundingClientRect();
        const punchRect = punchBtn.current?.getBoundingClientRect();
        const moveRect = moveZone.current?.getBoundingClientRect();
        const lookRect = lookZone.current?.getBoundingClientRect();

        // Jump first (right control) — pad so it's easy to hit while holding stick.
        if (inRect(t.clientX, t.clientY, jumpRect, 12)) {
          claimed = true;
          if (actionRef.current.flying) {
            flyId.current = t.identifier;
            useMobility.setState({ vertical: 1 });
          } else {
            fireJump();
          }
          continue;
        }

        if (inRect(t.clientX, t.clientY, punchRect, 8)) {
          claimed = true;
          if (actionRef.current.nearby?.kind === "player")
            useGame.getState().socialAct("punch");
          continue;
        }

        if (inRect(t.clientX, t.clientY, moveRect, 0)) {
          claimed = true;
          startStick(t);
          continue;
        }

        if (inRect(t.clientX, t.clientY, lookRect, 0) && lookId.current === null) {
          claimed = true;
          lookId.current = t.identifier;
          lookStart.current = { x: t.clientX, y: t.clientY, distance: 0 };
          lookLast.current = { x: t.clientX, y: t.clientY };
        }
      }
      if (claimed) event.preventDefault();
    };

    const onMove = (event: TouchEvent) => {
      let used = false;
      if (moveId.current !== null) {
        const t = touchById(event.touches, moveId.current);
        if (t) {
          applyStick(t.clientX, t.clientY);
          used = true;
        }
      }
      if (lookId.current !== null) {
        const t = touchById(event.touches, lookId.current);
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
        if (flyId.current === t.identifier) {
          flyId.current = null;
          useMobility.setState({ vertical: 0 });
        }
        // Only the stick finger clears the stick.
        if (moveId.current === t.identifier) clearStick();
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

    const opts: AddEventListenerOptions = { passive: false, capture: true };
    window.addEventListener("touchstart", onStart, opts);
    window.addEventListener("touchmove", onMove, opts);
    window.addEventListener("touchend", onEnd, opts);
    window.addEventListener("touchcancel", onEnd, opts);

    const onBlur = () => {
      clearStick();
      lookId.current = null;
      flyId.current = null;
      useMobility.setState({ vertical: 0 });
      resetTouchDrive();
    };
    window.addEventListener("blur", onBlur);

    return () => {
      window.removeEventListener("touchstart", onStart, opts);
      window.removeEventListener("touchmove", onMove, opts);
      window.removeEventListener("touchend", onEnd, opts);
      window.removeEventListener("touchcancel", onEnd, opts);
      window.removeEventListener("blur", onBlur);
    };
  }, [gameplayReady]);

  if (!gameplayReady) return null;

  return (
    <>
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

        {nearby?.kind === "player" && (
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
          className="pointer-events-none absolute z-40 inline-flex items-center justify-center rounded-full border border-white/20 bg-slate-800/40 text-white/80 shadow-none touch-none"
          style={{ opacity: jumpDisabled ? 0.5 : 1 }}
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
        </div>
      </div>
    </>
  );
}
