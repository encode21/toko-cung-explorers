import { useEffect } from "react";
import { useProfile } from "@/identity/profile-store";
import { AdventureSkeleton } from "@/ui/adventure/ActionButton";
import { GameButton } from "@/ui/game-ui/GamePanel";
import { ExplorerWardrobe } from "@/ui/profile/ExplorerWardrobe";
import "./shop-panel.css";

/** The shop shares the wardrobe's catalog, purchases, and temporary appearance draft. */
export function ShopPanel({ onClose }: { onClose: () => void }) {
  const profile = useProfile((s) => s.profile);
  const error = useProfile((s) => s.error);
  const load = useProfile((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  if (!profile) {
    return (
      <div className="game-shop-loading">
        {error ? (
          <div role="alert" className="space-y-3 text-center">
            <p>{error}</p>
            <GameButton onClick={() => void load()}>Coba lagi</GameButton>
          </div>
        ) : (
          <AdventureSkeleton label="Menyiapkan toko…" />
        )}
      </div>
    );
  }

  return (
    <div className="game-shop-panel">
      <ExplorerWardrobe key={profile.id} initialSection="shop" onBack={onClose} />
    </div>
  );
}
