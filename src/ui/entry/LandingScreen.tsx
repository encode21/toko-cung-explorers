import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { loginAsGuest, useSession } from "@/auth/useSession";
import { AppBridge } from "@/lib/app-bridge";
import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { FEATURES } from "@/ui/entry/hustle";

export function LandingScreen() {
  const { user, loading } = useSession();
  const [help, setHelp] = useState(false);
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState("");
  const navigate = useNavigate();
  const tryAsGuest = async () => {
    setGuestBusy(true);
    setGuestError("");
    try {
      await loginAsGuest();
      await navigate({ to: "/world" });
    } catch (e) {
      setGuestError(e instanceof Error ? e.message : "Mode tamu belum bisa dibuka. Coba lagi.");
    } finally {
      setGuestBusy(false);
    }
  };
  const startLabel = !loading && user ? "Lanjutkan usahamu" : "Mulai dari nol";

  return (
    <AdventureShell chapter="Hidup di Mampang dimulai" entry allowPortrait>
      <div className="entry-landing-layout">
        <section className="entry-welcome entry-welcome-card">
          <p className="adventure-eyebrow">Mampang versi game · Tokonya beneran ada</p>
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
            Mulai dari nol: narik ojol pakai motor sewaan, kulakan di Toko Cung, buka gerobak,
            sampai punya warteg dan kosan. Semua uang di game hanya simulasi.
          </p>
          <div className="entry-start-actions">
            <Link className="adventure-button" to={user ? "/world" : "/auth"}>
              {startLabel} <span aria-hidden>→</span>
            </Link>
            {!loading && !user && (
              <button
                type="button"
                className="adventure-button adventure-secondary"
                disabled={guestBusy}
                onClick={() => void tryAsGuest()}
              >
                {guestBusy ? "Menyiapkan…" : "Coba sebagai tamu"}
              </button>
            )}
            <button
              type="button"
              className="adventure-button adventure-secondary"
              onClick={() => setHelp(true)}
            >
              Cara bermain
            </button>
          </div>
          {!loading && !user && (
            <p className="entry-guest-note" role={guestError ? "alert" : undefined}>
              {guestError ||
                "Tanpa daftar. Progres tamu hilang dalam 24 jam — daftar kapan saja untuk menyimpan."}
            </p>
          )}
          <AppBridge className="entry-app-link">Belanja di Toko Cung App</AppBridge>
        </section>

        <aside className="entry-world-preview" aria-label="Jalan jadi juragan">
          <header className="entry-preview-head">
            <p className="adventure-eyebrow">Hidup di Mampang</p>
            <h2>Mau mulai dari mana?</h2>
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
        <GameModal title="Hari pertamamu di Mampang" onClose={() => setHelp(false)}>
          <ol className="space-y-3">
            <li>
              <strong>1. Masuk</strong>
              <p>Daftar atau masuk dengan nomor telepon dan PIN game.</p>
            </li>
            <li>
              <strong>2. Pilih channel</strong>
              <p>Satu kota bareng tetangga dan pemain lain.</p>
            </li>
            <li>
              <strong>3. Cari uang pertama</strong>
              <p>
                Buka Handphone → Ojek untuk narik pakai motor di parkiran, atau Warungku untuk buka
                gerobak, lalu kulakan di Toko Cung.
              </p>
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
