import { toggleFlashlightItem, toggleSummitBoardItem, useMountain } from "@/game/mountain/store";
import { miniParticipant } from "@/game/minigames/store";
import { vehicleContextAction } from "@/game/vehicles/runtime";
import { useFishing } from "@/game/fishing/store";
import { performContextAction } from "@/game/interactions/context-action";
import { gameUiBlocked, useGameUi } from "@/state/game-ui-store";
import { useEffect, useRef } from "react";
import { useGame } from "@/state/game-store";
import { useControls } from "@/game/player/control-state";

export interface KeyState {
  forward: boolean;
  back: boolean;
  left: boolean;
  right: boolean;
  run: boolean;
  yawLeft: boolean;
  yawRight: boolean;
  jump: boolean;
  descend: boolean;
}

const MAP: Record<string, keyof KeyState> = {
  KeyW: "forward",
  ArrowUp: "forward",
  KeyS: "back",
  ArrowDown: "back",
  KeyA: "left",
  KeyD: "right",
  ShiftLeft: "run",
  ShiftRight: "run",
  KeyQ: "yawLeft",
  ArrowLeft: "yawLeft",
  KeyE: "yawRight",
  ArrowRight: "yawRight",
  Space: "jump",
  ControlLeft: "descend",
  ControlRight: "descend",
};

export function useKeyboard() {
  const keys = useRef<KeyState>({
    forward: false,
    back: false,
    left: false,
    right: false,
    run: false,
    yawLeft: false,
    yawRight: false,
    jump: false,
    descend: false,
  });

  useEffect(() => {
    const typing = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      return (
        tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || el?.isContentEditable === true
      );
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e) || gameUiBlocked()) return;
      const store = useGame.getState();
      if (e.code === "Digit1" && !e.repeat) {
        toggleFlashlightItem();
        return;
      }
      if (e.code === "Digit2" && !e.repeat) {
        toggleSummitBoardItem();
        return;
      }
      if (e.code === "KeyL" && !e.repeat) {
        const mountain = useMountain.getState();
        if (!mountain.flashlightEquipped) mountain.equipFlashlight();
        useMountain.getState().toggleFlashlight();
        return;
      }
      if (e.code === "KeyE" && !e.repeat && vehicleContextAction()) {
        e.preventDefault();
        return;
      }
      if (e.code === "KeyF") {
        if (e.repeat) return;
        void performContextAction();
        return;
      }
      if (e.code === "KeyG") {
        if (store.nearby?.kind === "player") store.socialAct("punch");
        return;
      }
      if (e.code === "Escape") {
        store.closeOverlay();
        return;
      }
      if (e.code === "Space") {
        e.preventDefault();
        if (e.repeat && (useFishing.getState().open || miniParticipant())) return;
        keys.current.jump = true;
        useControls.getState().queueJump();
        return;
      }
      const k = MAP[e.code];
      if (k) keys.current[k] = true;
    };
    const up = (e: KeyboardEvent) => {
      if (typing(e)) return;
      if (e.code === "Space") {
        keys.current.jump = false;
        return;
      }
      const k = MAP[e.code];
      if (k) keys.current[k] = false;
    };
    const blur = () => {
      keys.current = {
        forward: false,
        back: false,
        left: false,
        right: false,
        run: false,
        yawLeft: false,
        yawRight: false,
        jump: false,
        descend: false,
      };
    };
    const unsubscribe = useGameUi.subscribe(() => {
      if (gameUiBlocked()) blur();
    });
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      unsubscribe();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return keys;
}
