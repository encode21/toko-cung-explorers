import { useId, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

/** Only the message scrolls; the customer's identity and answer buttons stay in view. */
export function WarungStoryShell({
  label,
  header,
  children,
  actions,
  kind,
  reply,
  className = "",
}: {
  label: string;
  header: ReactNode;
  children: ReactNode;
  actions: ReactNode;
  kind?: string;
  reply?: string;
  className?: string;
}) {
  const id = useId();
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [overflow, setOverflow] = useState(false);
  const [atEnd, setAtEnd] = useState(false);
  const measure = () => {
    const el = scrollRef.current;
    if (!el) return;
    setOverflow(el.scrollHeight > el.clientHeight + 2);
    setAtEnd(el.scrollHeight - el.clientHeight - el.scrollTop <= 2);
  };
  useLayoutEffect(() => {
    measure();
    const observer = new ResizeObserver(measure);
    if (scrollRef.current) observer.observe(scrollRef.current);
    if (contentRef.current) observer.observe(contentRef.current);
    return () => observer.disconnect();
  }, []);
  return (
    <section
      className={`warung-story warung-story-shell ${className}`}
      data-kind={kind}
      data-reply={reply}
      aria-label={label}
    >
      <header>{header}</header>
      <div
        className="warung-story-scroll"
        id={id}
        ref={scrollRef}
        onScroll={measure}
        tabIndex={overflow ? 0 : undefined}
        role="region"
        aria-label={`Rincian ${label}`}
      >
        <div className="warung-story-copy" ref={contentRef}>
          {children}
        </div>
      </div>
      {overflow && (
        <button
          type="button"
          className="warung-story-scroll-cue"
          aria-controls={id}
          onClick={() => {
            const el = scrollRef.current;
            if (!el) return;
            el.scrollTo({
              top: atEnd ? 0 : el.scrollTop + el.clientHeight * 0.8,
              behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? "instant"
                : "smooth",
            });
          }}
        >
          {atEnd ? <ChevronUp size={15} aria-hidden /> : <ChevronDown size={15} aria-hidden />}
          {atEnd ? "Kembali ke atas" : "Baca selengkapnya"}
        </button>
      )}
      <footer className="warung-actions">{actions}</footer>
    </section>
  );
}
