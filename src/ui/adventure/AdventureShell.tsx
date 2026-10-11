import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import hero from "@/assets/home-hero-world.jpg";

export function AdventureShell({ children, chapter }: { children: ReactNode; chapter: string }) {
  return (
    <main className="adventure-shell">
      <img className="adventure-backdrop" src={hero} alt="" fetchPriority="high" />
      <div className="adventure-shade" />
      <header className="adventure-header">
        <Link to="/" className="flex min-w-0 items-center gap-3" aria-label="Toko Cung World">
          <img
            src="/logo-toko-cung-world.png"
            alt="Toko Cung World"
            width={220}
            height={73}
            className="h-9 w-auto max-w-[min(14rem,55vw)] object-contain sm:h-11"
          />
        </Link>
        <span className="adventure-eyebrow hidden sm:block">{chapter}</span>
      </header>
      <div className="adventure-content">{children}</div>
      <footer className="adventure-footer">
        <span>MAIN. JELAJAH. TEMUKAN CERITAMU.</span>
        <span>AN OPEN WORLD BY TOKO CUNG</span>
      </footer>
    </main>
  );
}
