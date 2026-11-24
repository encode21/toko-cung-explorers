import { useEffect } from "react";
import { addAfterEffect, useThree } from "@react-three/fiber";
import { CLIP_WIDTH, useClip } from "./clip";

/** Copies the canvas to a tiny JPEG right after a render whenever a clip frame is requested. */
export function ClipCapture() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    let handled = 0;
    return addAfterEffect(() => {
      const { recording, request } = useClip.getState();
      if (!recording || request === handled) return;
      handled = request;
      try {
        const src = gl.domElement;
        const out = document.createElement("canvas");
        out.width = CLIP_WIDTH;
        out.height = Math.max(1, Math.round((CLIP_WIDTH * src.height) / Math.max(1, src.width)));
        out.getContext("2d")?.drawImage(src, 0, 0, out.width, out.height);
        const frame = out.toDataURL("image/jpeg", 0.6);
        useClip.setState((s) => ({ frames: [...s.frames, frame].slice(0, 5) }));
      } catch {
        /* tainted or lost context: skip this frame */
      }
    });
  }, [gl]);
  return null;
}
