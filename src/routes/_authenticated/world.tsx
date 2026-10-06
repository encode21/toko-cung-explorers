import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { GameCanvas } from "@/game/engine/GameCanvas";
import { GameUi } from "@/ui/GameUi";
import { ASSET_CREDITS } from "@/assets/game-assets";
import { useNet } from "@/net/net-store";
import { saveDisplayName, useSession } from "@/auth/useSession";
import { supabase } from "@/integrations/supabase/client";
import { pageMeta } from "@/lib/site-meta";

export const Route = createFileRoute("/_authenticated/world")({
  ssr: false,
  head: () => ({
    meta: pageMeta({
      title: "Masuk Dunia Toko Cung — Belanja Langsung di Toko 3D",
      description:
        "Jalan-jalan di depan Toko Cung, masuk, tanya nakama, ambil barang dari rak, dan bayar di kasir lewat QRIS atau Virtual Account.",
      path: "/world",
    }),
  }),
  component: WorldPage,
});

function WorldPage() {
  const [entered, setEntered] = useState(false);
  const name = useNet((s) => s.name);
  const setName = useNet((s) => s.setName);
  const room = useNet((s) => s.room);
  const [draft, setDraft] = useState(name);
  const session = useSession();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  // Nama pemain mengikuti akun yang login.
  useEffect(() => {
    if (session.displayName) {
      setDraft((d) => d || session.displayName);
      setName(session.displayName);
    }
  }, [session.displayName, setName]);

  const enter = () => {
    const value = (draft.trim() || session.displayName || "Pengunjung").slice(0, 18);
    setName(value);
    if (session.user && value !== session.displayName) void saveDisplayName(session.user.id, value);
    setEntered(true);
  };

  const signOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  };


  return (
    <main className="fixed inset-0 overflow-hidden bg-background">
      <h1 className="sr-only">Dunia 3D Toko Cung</h1>
      <GameCanvas />
      <GameUi mobileControlsEnabled={entered} />

      {!entered && (
        <div className="absolute inset-0 z-40 flex items-center justify-center overflow-y-auto bg-[oklch(0.16_0.03_50/0.86)] p-4 backdrop-blur-sm sm:p-6">
          <div className="w-full max-w-lg rounded-2xl border border-world-outline bg-world-panel p-5 text-world-panel-foreground sm:p-7">
            <p className="text-world-muted text-xs uppercase tracking-[0.3em]">Digital twin</p>
            <p className="mt-2 font-display text-5xl leading-none tracking-wide">TOKO CUNG WORLD</p>
            <p className="mt-3 text-sm text-world-muted">
              Kamu spawn di depan Toko Cung. Jalan masuk, sapa nakama, ambil barang dari rak, lalu bayar di kasir —
              belanjanya sungguhan, bukan katalog.
            </p>
            <ul className="mt-4 space-y-1 text-sm">
              <li className="md:hidden">
                <span className="font-semibold">Analog kiri</span> jalan ·{" "}
                <span className="font-semibold">geser kanan</span> putar kamera · tombol tangan untuk berinteraksi
              </li>
              <li className="hidden md:list-item">
                <span className="font-semibold">Klik kanan tahan lalu geser</span> — geser ke atas jalan, ke bawah
                mundur, ke samping memutar arah
              </li>
              <li className="hidden md:list-item">
                <span className="font-semibold">WASD</span> jalan · <span className="font-semibold">Shift</span> lari
              </li>
              <li className="hidden md:list-item">
                <span className="font-semibold">Q / E</span> putar kamera
              </li>
              <li className="hidden md:list-item">
                <span className="font-semibold">F</span> bicara dengan NPC, buka rak, atau buka kasir
              </li>
            </ul>
            <label className="mt-5 block text-world-muted text-xs uppercase tracking-[0.2em]" htmlFor="player-name">
              Nama kamu
            </label>
            <input
              id="player-name"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              maxLength={18}
              placeholder="mis. Rangga"
              className="mt-1 w-full rounded-lg border border-world-outline bg-[oklch(0.2_0.02_50/0.6)] px-3 py-2 text-sm outline-none placeholder:text-world-muted"
            />
            <p className="mt-1 text-world-muted text-[11px]">
              Ruangan: <span className="font-semibold">{room}</span> — pemain lain yang membuka tautan yang sama akan
              terlihat di dunia dan bisa diajak chat.
            </p>
            <button
              type="button"
              onClick={enter}
              className="mt-6 w-full rounded-lg bg-world-brand px-5 py-3 font-semibold text-world-brand-foreground transition hover:brightness-110"
            >
              Mulai jalan
            </button>
            <div className="mt-3 flex items-center justify-between text-world-muted text-xs">
              <Link to="/" className="underline">
                Kembali ke halaman depan
              </Link>
              <span className="truncate">
                Akun: {session.user?.email ?? "—"}{" "}
                <button type="button" onClick={() => void signOut()} className="underline">
                  Keluar
                </button>
              </span>
            </div>
            <p className="mt-4 text-world-muted text-[11px] leading-relaxed">
              Model 3D sementara: {ASSET_CREDITS.map((c) => c.pack).join(", ")} oleh Kenney (CC0). Produk, stok, dan
              mitra memakai data Toko Cung asli.
            </p>
          </div>
        </div>
      )}
    </main>
  );
}
