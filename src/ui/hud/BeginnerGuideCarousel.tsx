import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** The same track handles touch, keyboard and the page buttons, including a partial last page. */
export function BeginnerGuideCarousel({ count, children }: { count: number; children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null);
  const [range, setRange] = useState({ first: 0, visible: 4 });
  useLayoutEffect(() => {
    const el = track.current;
    if (!el) return;
    const measure = () => {
      const card = el.firstElementChild as HTMLElement | null;
      if (!card || !el.clientWidth) return;
      const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
      const step = card.getBoundingClientRect().width + gap;
      if (step <= 0) return;
      const visible = Math.max(1, Math.round((el.clientWidth + gap) / step));
      const first = Math.max(0, Math.min(count - visible, Math.round(el.scrollLeft / step)));
      setRange((prev) =>
        prev.first === first && prev.visible === visible ? prev : { first, visible },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => {
      observer.disconnect();
      el.removeEventListener("scroll", measure);
    };
  }, [count]);
  const move = (index: number) => {
    const el = track.current;
    if (!el) return;
    const target = el.children[Math.max(0, Math.min(count - range.visible, index))] as
      HTMLElement | undefined;
    if (target)
      el.scrollTo({
        left: target.offsetLeft,
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
      });
  };
  const overflowing = count > range.visible;
  return (
    <section className="beginner-guide-carousel" aria-label="Kegiatan panduan">
      <div
        ref={track}
        className="beginner-guide-cards"
        role="group"
        aria-label="Daftar kegiatan"
        tabIndex={overflowing ? 0 : -1}
        onKeyDown={(event) => {
          if (!overflowing || event.target !== event.currentTarget) return;
          const offset = {
            ArrowLeft: range.first - 1,
            ArrowRight: range.first + 1,
            Home: 0,
            End: count - 1,
          }[event.key];
          if (offset !== undefined) {
            event.preventDefault();
            move(offset);
          }
        }}
      >
        {children}
      </div>
      {overflowing && (
        <nav className="beginner-guide-pager" aria-label="Geser kegiatan">
          <button
            type="button"
            aria-label="Kegiatan sebelumnya"
            disabled={range.first === 0}
            onClick={() => move(range.first - range.visible)}
          >
            <ChevronLeft aria-hidden />
          </button>
          <span aria-live="polite" aria-atomic="true">
            {range.first + 1}–{Math.min(count, range.first + range.visible)} dari {count}
          </span>
          <button
            type="button"
            aria-label="Kegiatan berikutnya"
            disabled={range.first + range.visible >= count}
            onClick={() => move(range.first + range.visible)}
          >
            <ChevronRight aria-hidden />
          </button>
        </nav>
      )}
    </section>
  );
}
