import type { ReactNode } from "react";
import { AdventureShell } from "@/ui/adventure/AdventureShell";
import "./landing.css";

/** One visual stage from the start menu through account and world preparation. */
export function EntryTitleScreen({
  children,
  status,
  error,
  embedded = false,
}: {
  children?: ReactNode;
  status?: string | undefined;
  error?: string | null;
  embedded?: boolean;
}) {
  return (
    <AdventureShell
      chapter=""
      entry
      allowPortrait
      chrome={false}
      embedded={embedded}
      className="entry-title-shell"
    >
      <section className="entry-title-screen" aria-labelledby="entry-title">
        <h1 id="entry-title" className="entry-title-logo">
          <img
            src="/logo-toko-cung-world.png"
            alt="Toko Cung World"
            width={1024}
            height={341}
            fetchPriority="high"
          />
        </h1>
        <div className="entry-title-menu" data-preparing={!!status}>
          {status && (
            <p className="entry-title-status" role="status" aria-live="polite" aria-atomic="true">
              {status}
            </p>
          )}
          {error && (
            <p className="entry-title-error" role="alert">
              {error}
            </p>
          )}
          {children}
        </div>
      </section>
    </AdventureShell>
  );
}
