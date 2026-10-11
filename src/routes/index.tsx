import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { Compass, Flag, Sparkles } from "lucide-react";
import { useSession } from "@/auth/useSession";
import { pageMeta } from "@/lib/site-meta";
import { AppBridge } from "@/lib/app-bridge";
import { AdventureShell } from "@/ui/adventure/AdventureShell";
export const Route = createFileRoute("/")({
  head: () => ({
    meta: pageMeta({
      title: "Toko Cung World — Petualanganmu Dimulai",
      description: "Jelajahi dunia Toko Cung, temui Nakama dan temukan quest bersama pemain lain.",
      path: "/",
    }),
  }),
  component: LandingPage,
});
function LandingPage() {
  const { user, loading } = useSession();
  const [help, setHelp] = useState(false);
  return (
    <AdventureShell chapter="Your next adventure">
      <div className="grid items-center gap-12 lg:grid-cols-[1.2fr_.8fr]">
        <section className="py-8 sm:py-14">
          <p className="adventure-eyebrow">Satu dunia. Banyak cerita.</p>
          <h1 className="mt-6 max-w-xl">
            <img
              src="/logo-toko-cung-world.png"
              alt="Toko Cung World"
              width={1024}
              height={341}
              className="h-auto w-full max-w-[min(28rem,92vw)] object-contain drop-shadow-[0_12px_40px_rgba(185,32,37,0.35)]"
              fetchPriority="high"
            />
            <span className="sr-only">Toko Cung World</span>
          </h1>
          <p className="mt-7 max-w-md text-lg leading-relaxed text-world-muted">
            Setiap sudut menyimpan petualangan.
            <br />
            Temui Nakama, temukan rahasia, dan tulis ceritamu sendiri.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link className="adventure-button" to={user ? "/world" : "/auth"}>
              {loading ? "Mulai Petualangan" : user ? "Lanjutkan Petualangan" : "Mulai Petualangan"}{" "}
              <span aria-hidden>→</span>
            </Link>
            <button
              className="adventure-button adventure-secondary"
              aria-expanded={help}
              onClick={() => setHelp(!help)}
            >
              Cara bermain
            </button>
          </div>
          {help && (
            <div className="adventure-panel mt-5 max-w-lg text-sm leading-7">
              <strong>Petualangan pertamamu</strong>
              <p>
                Masuk atau daftar, pilih channel, lalu jelajahi dunia. Buka Quest Board untuk
                memilih misi.
              </p>
              <p>
                Desktop: WASD untuk berjalan, Q/E untuk kamera, F untuk interaksi. HP: analog kiri
                untuk berjalan dan geser kanan untuk kamera.
              </p>
            </div>
          )}
          <AppBridge className="mt-7 inline-block min-h-11 text-sm text-world-muted underline underline-offset-4" />
        </section>
        <aside className="adventure-panel lg:mt-28">
          <p className="adventure-eyebrow">Selamat datang, penjelajah</p>
          <h2 className="mt-3 font-display text-4xl">DUNIA MENUNGGUMU.</h2>
          <div className="mt-8 space-y-6">
            {[
              {
                Icon: Compass,
                title: "Jelajahi lingkungan",
                copy: "Dari toko hingga gudang, selalu ada yang bisa ditemukan.",
              },
              {
                Icon: Flag,
                title: "Pilih petualanganmu",
                copy: "Bantu Nakama dan selesaikan tujuan dari Quest Board.",
              },
              {
                Icon: Sparkles,
                title: "Bertumbuh bersama",
                copy: "Raih XP, naik level, dan bertemu pemain di channel pilihanmu.",
              },
            ].map(({ Icon, title, copy }) => (
              <div key={title} className="flex gap-4">
                <Icon className="mt-1 size-6 shrink-0 text-world-accent" />
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm leading-6 text-world-muted">{copy}</p>
                </div>
              </div>
            ))}
          </div>
          <p className="mt-8 border-t border-world-outline pt-5 text-xs text-world-muted">
            Main di World. Belanja tetap di Toko Cung App.
          </p>
        </aside>
      </div>
    </AdventureShell>
  );
}
