import { useEffect, useState } from "react";
import { GameModal, GameButton } from "@/ui/game-ui/GamePanel";
import { useHud } from "@/state/hud-store";
import { useNet } from "@/net/net-store";
import { refreshRemoteProfile } from "@/net/profile-sync";
import { useClub, clubCommand } from "@/game/club/store";
import { AvatarPortrait } from "./AvatarPortrait";

/** Profile identity is refreshed through the existing authenticated connection lookup. */
export function PlayerInteractionMenu() {
  const id = useHud((s) => s.selectedPlayer);
  const person = useNet((s) => s.roster.find((p) => p.id === id));
  const club = useClub();
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
  const dancing = club.inside && club.data?.members[id]?.dance;
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
            {dancing && (
              <GameButton
                disabled={club.busy}
                onClick={async () => {
                  await clubCommand("sync", { target: id });
                  if (!useClub.getState().error) close();
                }}
              >
                Sync dance · {dancing.id}
              </GameButton>
            )}
            <GameButton
              onClick={() => {
                close();
                useHud.getState().setSheet("chat");
              }}
            >
              Buka obrolan dunia
            </GameButton>
          </div>
          {club.error && (
            <p role="alert" className="mt-2 text-red-200">
              {club.error}
            </p>
          )}
        </>
      )}
    </GameModal>
  );
}
