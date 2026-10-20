import { useEffect } from "react";
import { addAfterEffect, useThree } from "@react-three/fiber";
import { useHud } from "@/state/hud-store";
import { usePhoto } from "./photo-store";
import { photoCrop } from "./photo-camera";

/** Copy immediately after rendering, without retaining every WebGL drawing buffer. */
export function PhotoCapture() {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    let handled = -1;
    return addAfterEffect(() => {
      const state = usePhoto.getState();
      if (
        useHud.getState().sheet !== "camera" ||
        !state.ready ||
        !state.busy ||
        handled === state.request
      )
        return;
      handled = state.request;
      const request = state.request;
      const finish = (blob: Blob | null) => {
        if (useHud.getState().sheet === "camera") usePhoto.getState().finish(request, blob);
      };
      try {
        const source = gl.domElement;
        const frame = document.querySelector("[data-photo-frame]");
        if (!frame) return finish(null);
        const crop = photoCrop(
          source.getBoundingClientRect(),
          frame.getBoundingClientRect(),
          source.width,
          source.height,
        );
        if (!crop) return finish(null);
        const output = document.createElement("canvas");
        output.width = crop.outputWidth;
        output.height = crop.outputHeight;
        const ctx = output.getContext("2d");
        if (!ctx) return finish(null);
        ctx.drawImage(
          source,
          crop.x,
          crop.y,
          crop.width,
          crop.height,
          0,
          0,
          output.width,
          output.height,
        );
        output.toBlob(finish, "image/png");
      } catch {
        finish(null);
      }
    });
  }, [gl]);
  return null;
}
