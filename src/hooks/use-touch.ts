import { useEffect, useState } from "react";

/**
 * True bila perangkat menyediakan input sentuh sebagai pointer utama/tersedia.
 * Tidak memakai lebar layar saja — prefer pointer type + maxTouchPoints.
 */
export function useTouchControls() {
  const [touch, setTouch] = useState(false);

  useEffect(() => {
    const check = () => {
      const anyCoarse = window.matchMedia("(any-pointer: coarse)").matches;
      const noHover = window.matchMedia("(hover: none)").matches;
      const hasTouch = navigator.maxTouchPoints > 0 || "ontouchstart" in window;
      setTouch(hasTouch && (anyCoarse || noHover));
    };
    check();
    const coarseMq = window.matchMedia("(any-pointer: coarse)");
    const hoverMq = window.matchMedia("(hover: none)");
    coarseMq.addEventListener("change", check);
    hoverMq.addEventListener("change", check);
    window.addEventListener("resize", check);
    return () => {
      coarseMq.removeEventListener("change", check);
      hoverMq.removeEventListener("change", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return touch;
}
