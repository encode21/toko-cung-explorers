import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Compass, Flag, Sparkles, ShoppingBag } from "lucide-react";
import { useSession } from "@/auth/useSession";
import { AppBridge } from "@/lib/app-bridge";
import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { GameModal } from "@/ui/game-ui/GamePanel";

const FEATURES = [
  {
    Icon: Compass,
    title: "Jelajahi lingkungan",
    copy: "Dari toko hingga gudang, temukan sudut favoritmu.",
  },
  {
    Icon: Flag,
    title: "Pilih petualanganmu",
    copy: "Bantu Nakama dan selesaikan misi di Quest Board.",
  },
  {
    Icon: Sparkles,
    title: "Bertumbuh bersama",
    copy: "Raih XP, naik level, dan temui pemain lain.",
  },
] as const;

export function LandingScreen() {
  const { user, loading } = useSession();
  const [help, setHelp] = useState(false);
  const startLabel = !loading && user ? "Lanjutkan Petualangan" : "Mulai Petualangan";

  return (
    <AdventureShell chapter="Petualanganmu dimulai" entry>
      <div className="entry-landing-layout">
        <section className="entry-welcome entry-welcome-card">
          <p className="adventure-eyebrow">Satu dunia · Banyak cerita</p>
          <h1>
            <img
              src="/logo-toko-cung-world.png"
              alt="Toko Cung World"
              width={1024}
              height={341}
              fetchPriority="high"
            />
          </h1>
          <p className="entry-welcome-lede">
            Temui Nakama, temukan rahasia, dan tulis ceritamu sendiri.
          </p>
          <div className="entry-start-actions">
            <Link className="adventure-button" to={user ? "/world" : "/auth"}>
              {startLabel} <span aria-hidden>→</span>
            </Link>
            <button
              type="button"
              className="adventure-button adventure-secondary"
              onClick={() => setHelp(true)}
            >
              Cara bermain
            </button>
          </div>
          <AppBridge className="entry-app-link">
            Belanja di Toko Cung App
          </AppBridge>
        </section>

        <aside className="entry-world-preview" aria-label="Petualangan di World">
          <header className="entry-preview-head">
            <p className="adventure-eyebrow">Dunia menunggumu</p>
            <h2>Siap menjelajah?</h2>
          </header>
          <ul className="entry-feature-list">
            {FEATURES.map(({ Icon, title, copy }) => (
              <li className="entry-feature" key={title}>
                <span className="entry-feature-icon" aria-hidden>
                  <Icon />
                </span>
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </li>
            ))}
          </ul>
          <div className="entry-preview-foot">
            <span>Main di World</span>
            <AppBridge className="entry-app-link entry-app-link-inline">
              <ShoppingBag aria-hidden className="entry-app-link-icon" />
              Belanja di App
            </AppBridge>
          </div>
        </aside>
      </div>

      {help && (
        <GameModal title="Petualangan pertamamu" onClose={() => setHelp(false)}>
          <ol className="space-y-3">
            <li>
              <strong>1. Siapkan identitas</strong>
              <p>Masuk atau daftar langsung dengan nomor telepon dan PIN game.</p>
            </li>
            <li>
              <strong>2. Pilih channel</strong>
              <p>Masuk ke dunia dan temui Nakama serta pemain lain.</p>
            </li>
            <li>
              <strong>3. Temukan quest</strong>
              <p>Buka Quest Board, pilih misi, lalu ikuti petunjuknya.</p>
            </li>
          </ol>
          <p className="mt-3">
            HP: analog kiri untuk berjalan, geser kanan untuk kamera. Desktop: WASD berjalan, Q/E
            kamera, F interaksi.
          </p>
        </GameModal>
      )}
    </AdventureShell>
  );
}
