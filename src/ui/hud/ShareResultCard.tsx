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
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
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
  const [attempt, setAttempt] = useState(0);
  const [sharing, setSharing] = useState(false);

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
  }, [attempt]);

  function retry() {
    setFailed(false);
    setCard(null);
    setAttempt((value) => value + 1);
  }

  async function share() {
    if (!card || sharing) return;
    setSharing(true);
    const toast = useGame.getState().setToast;
    try {
      const r = await shareResultCard(card.file, card.caption);
      if (r === "downloaded") toast("Gambar diunduh dan teks disalin. Siap dibagikan!");
      if (r === "downloaded-nocopy") toast("Gambar diunduh. Gunakan Salin teks untuk caption.");
    } catch {
      toast("Hasil belum bisa dibagikan. Coba lagi.");
    } finally {
      setSharing(false);
    }
  }

  async function copyCaption() {
    if (!card) return;
    const toast = useGame.getState().setToast;
    try {
      if (!navigator.clipboard) throw new Error("clipboard unavailable");
      await navigator.clipboard.writeText(card.caption);
      toast("Teks hasil sudah disalin.");
    } catch {
      toast("Teks belum bisa disalin. Pilih teks di bawah gambar lalu salin.");
    }
  }

  return (
    <GameModal
      title="Bagikan hasil"
      className="share-result-sheet"
      bodyClassName="share-result-body"
      onClose={onClose}
      footer={
        <>
          <p className="share-card-caption">{card?.caption ?? "Pratinjau hasil usahamu"}</p>
          <div className="share-card-actions">
            {card && (
              <GameButton className="share-card-copy" onClick={() => void copyCaption()}>
                Salin teks
              </GameButton>
            )}
            <GameButton
              className="share-card-submit"
              disabled={!card || sharing}
              onClick={() => void share()}
            >
              {sharing ? "Membagikan…" : "Bagikan"}
            </GameButton>
          </div>
        </>
      }
    >
      <div className="share-card" aria-busy={!card && !failed}>
        {card ? (
          <img src={card.url} alt="Kartu hasil warungku di Toko Cung World" />
        ) : (
          <div className="share-card-placeholder" role="status">
            <p>{failed ? "Hasil belum bisa ditampilkan." : "Menyiapkan hasil…"}</p>
            {failed && (
              <GameButton className="share-card-submit" onClick={retry}>
                Coba lagi
              </GameButton>
            )}
          </div>
        )}
      </div>
    </GameModal>
  );
}
