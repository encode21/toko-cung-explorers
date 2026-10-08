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
  });

  useEffect(() => {
    const typing = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      const tag = el?.tagName;
      return tag === "INPUT" || tag === "TEXTAREA" || el?.isContentEditable === true;
    };
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return;
      const store = useGame.getState();
      if (e.code === "KeyF") {
        if (e.repeat) return;
        store.interact();
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
      };
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
    };
  }, []);

  return keys;
}
