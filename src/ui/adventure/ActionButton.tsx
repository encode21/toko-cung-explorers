import { useEffect, useState, type ButtonHTMLAttributes } from "react";
import { Check, LoaderCircle, AlertCircle } from "lucide-react";
export function ActionButton({
  busy = false,
  busyLabel = "Memproses…",
  outcome,
  children,
  className = "",
  disabled,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  busy?: boolean;
  busyLabel?: string;
  outcome?: "success" | "error" | undefined;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    setSlow(false);
    if (!busy) return;
    const id = setTimeout(() => setSlow(true), 8000);
    return () => clearTimeout(id);
  }, [busy]);
  return (
    <span className={`inline-flex max-w-full flex-col ${className.includes("w-full") ? "w-full" : ""}`}>
      <button
        {...props}
        disabled={disabled || busy}
        aria-busy={busy}
        className={`adventure-button ${className}`}
      >
        <span className="grid min-w-5 place-items-center">
          {busy ? (
            <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" />
          ) : outcome === "success" ? (
            <Check className="size-4" />
          ) : outcome === "error" ? (
            <AlertCircle className="size-4" />
          ) : (
            <span aria-hidden>↗</span>
          )}
        </span>
        <span className="grid">
          <span className={busy ? "invisible col-start-1 row-start-1" : "col-start-1 row-start-1"}>
            {children}
          </span>
          <span role={busy ? "status" : undefined} aria-hidden={!busy} className={`col-start-1 row-start-1 ${busy ? "" : "invisible"}`}>{busyLabel}</span>
        </span>
      </button>
      {slow && (
        <span role="status" className="mt-2 text-xs text-world-accent">
          Masih diproses…
        </span>
      )}
    </span>
  );
}
export function AdventureSkeleton({ label = "Memuat…" }: { label?: string }) {
  return (
    <div role="status" aria-label={label} className="space-y-3 py-5">
      <span className="text-sm text-world-muted">{label}</span>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className="h-14 animate-pulse rounded-xl bg-white/10 motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}
