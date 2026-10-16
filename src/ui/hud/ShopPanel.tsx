import { useEffect } from "react";
import { X } from "lucide-react";
import { useProfile } from "@/identity/profile-store";
import { AdventureSkeleton } from "@/ui/adventure/ActionButton";
import { GameButton, GameIconButton } from "@/ui/game-ui/GamePanel";
import { ExplorerWardrobe } from "@/ui/profile/ExplorerWardrobe";

/** Shared wardrobe host for Shop (Toko) and Appearance (Sesuaikan). */
export function ShopPanel({
  onClose,
  initialSection = "shop",
}: {
  onClose: () => void;
  initialSection?: "look" | "closet" | "shop";
}) {
  const profile = useProfile((s) => s.profile);
  const error = useProfile((s) => s.error);
  const load = useProfile((s) => s.load);
  const shop = initialSection === "shop";

  useEffect(() => {
    void load();
  }, [load]);

  if (!profile) {
    return (
      <div className="game-shop-loading">
        <GameIconButton
          label={shop ? "Tutup Shop" : "Tutup penampilan"}
          data-game-close
          onClick={onClose}
        >
          <X aria-hidden />
        </GameIconButton>
        {error ? (
          <div role="alert" className="space-y-3 text-center">
            <p>{error}</p>
            <GameButton onClick={() => void load()}>Coba lagi</GameButton>
          </div>
        ) : (
          <AdventureSkeleton label={shop ? "Menyiapkan toko…" : "Menyiapkan penampilan…"} />
        )}
      </div>
    );
  }

  return (
    <div className="game-shop-panel">
      <ExplorerWardrobe key={`${profile.id}-${initialSection}`} initialSection={initialSection} onBack={onClose} />
    </div>
  );
}
