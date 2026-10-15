import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { QuestCompletion } from "@/game/core/completion-store";
import "./quest-confetti.css";

const COLORS = ["#ffa415", "#39bddf", "#aa7ded", "#ed729f", "#98cf60", "#ffda69"];
const PARTICLES = Array.from({ length: 48 }, (_, index) => {
  const rotation = (index * 47) % 360;
  return {
    "--confetti-offset": `${((index * 7) % 25) - 12}px`,
    "--confetti-color": COLORS[index % COLORS.length],
    "--confetti-width": `${4 + (index % 5)}px`,
    "--confetti-height": `${8 + (index % 7)}px`,
    "--confetti-drift": (((index * 37) % 101) - 50) / 50,
    "--confetti-lift": 0.65 + ((index * 17) % 36) / 100,
    "--confetti-start": `${rotation}deg`,
    "--confetti-end": `${rotation + 540 + (index % 5) * 90}deg`,
    "--confetti-delay": `${(index % 7) * 35}ms`,
    "--confetti-duration": `${3000 + (index % 7) * 140}ms`,
  } as CSSProperties;
});

type ConfettiBurst = { container: HTMLElement; origin: CSSProperties };

/** One short decorative burst per completion; never intercepts gameplay or modal controls. */
export function QuestConfetti({ trigger }: { trigger: QuestCompletion }) {
  const [burst, setBurst] = useState<ConfettiBurst | null>(null);

  useEffect(() => {
    setBurst(null);
    let frame = 0;
    let attempts = 0;
    let timer: number | undefined;
    // Radix may mount its portal after this component's first effect.
    const launch = () => {
      const container =
        document.querySelector<HTMLElement>("[data-game-ui-root]") ??
        document.querySelector<HTMLElement>(".world-viewport");
      const modal = container?.querySelector<HTMLElement>(".quest-complete-modal");
      const bounds = container?.getBoundingClientRect();
      const card = modal?.getBoundingClientRect();
      if (!container || !bounds?.width || !bounds.height || !card?.width || !card.height) {
        if (++attempts < 8) frame = window.requestAnimationFrame(launch);
        return;
      }

      // Relative coordinates also account for viewport offsets and CSS scaling.
      const x = (card.left + card.width / 2 - bounds.left) / bounds.width;
      const y = (card.top + card.height * 0.55 - bounds.top) / bounds.height;
      const originY = y * container.clientHeight;
      setBurst({
        container,
        origin: {
          "--confetti-origin-x": `${x * 100}%`,
          "--confetti-origin-y": `${y * 100}%`,
          "--confetti-rise-space": `${Math.min(originY * 0.9, 260)}px`,
          "--confetti-spread": `${Math.min(container.clientWidth * 0.38, 340)}px`,
          "--confetti-fall-distance": `${container.clientHeight - originY + 30}px`,
        } as CSSProperties,
      });
      // The longest launch delay + flight finishes before this cleanup deadline.
      timer = window.setTimeout(() => setBurst(null), 6000);
    };
    frame = window.requestAnimationFrame(launch);
    return () => {
      window.cancelAnimationFrame(frame);
      window.clearTimeout(timer);
    };
  }, [trigger]);

  if (!burst) return null;

  return createPortal(
    <div className="quest-confetti" style={burst.origin} aria-hidden="true">
      {PARTICLES.map((style, index) => (
        <span key={index} className="quest-confetti-particle" style={style}>
          <i />
        </span>
      ))}
    </div>,
    burst.container,
  );
}
