import { useEffect, useState } from "react";
import { GameModal, GameButton } from "@/ui/game-ui/GamePanel";
import { useHud } from "@/state/hud-store";
import { useNet } from "@/net/net-store";
import { refreshRemoteProfile } from "@/net/profile-sync";
import { AvatarPortrait } from "./AvatarPortrait";

/** Profile identity is refreshed through the existing authenticated connection lookup. */
export function PlayerInteractionMenu() {
  const id = useHud((s) => s.selectedPlayer);
  const person = useNet((s) => s.roster.find((p) => p.id === id));
  const [loading, setLoading] = useState(false);
  useEffect(() => {
    if (!id) return;
    let active = true;
    setLoading(true);
    void refreshRemoteProfile(id).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [id]);
  if (!id) return null;
  const close = () => useHud.setState({ selectedPlayer: null });
  return (
    <GameModal title={person?.name ?? "Pemain"} onClose={close}>
      {!person ? (
        <p>Pemain sudah meninggalkan ruangan.</p>
      ) : (
        <>
          <div className="flex items-center gap-3">
            {person.avatar && (
              <AvatarPortrait
                avatar={person.avatar}
                character={person.character ?? null}
                size="sm"
              />
            )}
            <div>
              <strong>{person.name}</strong>
              <p>
                {loading
                  ? "Memuat identitas…"
                  : `Lv. ${person.level ?? 1} · ${person.title ?? "Penjelajah"}`}
              </p>
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <GameButton
              onClick={() => {
                close();
                useHud.getState().setSheet("chat");
              }}
            >
              Buka obrolan dunia
            </GameButton>
          </div>
        </>
      )}
    </GameModal>
  );
}
