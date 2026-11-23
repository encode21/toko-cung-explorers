import { useEffect, useState } from "react";
import { useGameCore } from "@/game/core/store";
import { ojekCommand, useOjek } from "@/game/ojek/store";
import { usahaCommand, useUsaha } from "@/game/usaha/store";
import { useWarung } from "@/game/warung/store";
import {
  renderResultCard,
  shareCaption,
  shareResultCard,
  type ShareStats,
} from "@/game/share/result-card";
import { useProfile } from "@/identity/profile-store";
import { useNet } from "@/net/net-store";
import { useGame } from "@/state/game-store";
import { GameModal } from "@/ui/game-ui/GamePanel";
import "./share-card.css";

/** One-shot read of the current snapshots (no subscriptions, so no fresh-object selectors). */
async function readStats(): Promise<ShareStats | null> {
  const w = useWarung.getState().data?.warung;
  if (!w) return null;
  await Promise.all([
    useUsaha.getState().data ? null : usahaCommand("read"),
    useOjek.getState().data ? null : ojekCommand("read"),
  ]);
  const kos = useUsaha.getState().data?.kos;
  const trips = useOjek.getState().data?.ojek.tripsThisHour ?? 0;
  return {
    playerName: useProfile.getState().profile?.displayName || useNet.getState().name || "Explorer",
    playerLevel: useGameCore.getState().snapshot?.profile?.level ?? 1,
    warungName: w.name,
    warungLevel: w.level,
    levelName: w.levelName,
    totalSales: w.totalSales,
    kos: kos ? { tenants: kos.tenants, rooms: kos.rooms } : null,
    ojekTrips: trips > 0 ? trips : null,
  };
}

export function ShareResultModal({ onClose }: { onClose: () => void }) {
  const [card, setCard] = useState<{ file: File; url: string; caption: string } | null>(null);
  const [failed, setFailed] = useState(false);

  // Render before the tap so navigator.share keeps the user's activation.
  useEffect(() => {
    let url = "";
    let alive = true;
    readStats()
      .then(async (s) => {
        if (!s) throw new Error("no warung");
        const blob = await renderResultCard(s);
        if (!alive) return;
        url = URL.createObjectURL(blob);
        setCard({
          file: new File([blob], "toko-cung-world.png", { type: "image/png" }),
          url,
          caption: shareCaption(s),
        });
      })
      .catch(() => alive && setFailed(true));
    return () => {
      alive = false;
      if (url) URL.revokeObjectURL(url);
    };
  }, []);

  async function share() {
    if (!card) return;
    const r = await shareResultCard(card.file, card.caption);
    const toast = useGame.getState().setToast;
    if (r === "downloaded") toast("Gambar diunduh, caption sudah disalin. Tinggal posting!");
    if (r === "downloaded-nocopy") toast("Gambar diunduh. Salin caption di bawah gambar ya.");
  }

  return (
    <GameModal title="Bagikan hasil" className="game-warung-sheet" onClose={onClose}>
      <div className="share-card">
        {card ? (
          <img src={card.url} alt="Kartu hasil warungku di Toko Cung World" />
        ) : (
          <div className="share-card-placeholder" role="status">
            {failed ? "Kartu belum bisa dibuat. Coba lagi nanti." : "Menyiapkan kartu…"}
          </div>
        )}
        {card && (
          <>
            <p className="share-card-caption">{card.caption}</p>
            <button type="button" className="warung-cta" onClick={() => void share()}>
              Bagikan
            </button>
            <small>Tombol tidak jalan? Tahan gambar di atas untuk menyimpan.</small>
          </>
        )}
      </div>
    </GameModal>
  );
}
