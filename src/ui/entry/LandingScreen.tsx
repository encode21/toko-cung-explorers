import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Compass, Flag, Sparkles } from "lucide-react";
import { useSession } from "@/auth/useSession";
import { AppBridge } from "@/lib/app-bridge";
import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { GameModal } from "@/ui/game-ui/GamePanel";

export function LandingScreen() {
  const { user, loading } = useSession();
  const [help, setHelp] = useState(false);
  return (
    <AdventureShell chapter="Petualanganmu dimulai" entry>
      <div className="entry-landing-layout">
        <section className="entry-welcome">
          <p className="adventure-eyebrow">Satu dunia. Banyak cerita.</p>
          <h1>
            <img
              src="/logo-toko-cung-world.png"
              alt="Toko Cung World"
              width={1024}
              height={341}
              fetchPriority="high"
            />
          </h1>
          <p>Temui Nakama, temukan rahasia, dan tulis ceritamu sendiri.</p>
          <div className="entry-start-actions">
            <Link className="adventure-button" to={user ? "/world" : "/auth"}>
              {!loading && user ? "Lanjutkan Petualangan" : "Mulai Petualangan"}{" "}
              <span aria-hidden>→</span>
            </Link>
            <button className="adventure-button adventure-secondary" onClick={() => setHelp(true)}>
              Cara bermain
            </button>
          </div>
          <AppBridge className="entry-app-link" />
        </section>
        <aside className="entry-world-preview" aria-label="Petualangan di World">
          <p className="adventure-eyebrow">Dunia menunggumu</p>
          {[
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
          ].map(({ Icon, title, copy }) => (
            <div className="entry-feature" key={title}>
              <Icon aria-hidden />
              <div>
                <h2>{title}</h2>
                <p>{copy}</p>
              </div>
            </div>
          ))}
          <span className="entry-world-note">Main di World · Belanja di Toko Cung App</span>
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
