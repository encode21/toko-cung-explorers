import { useGame } from "@/state/game-store";
import { isHomeRoom } from "@/game/home/model";
import { useWarung } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { useClub } from "@/game/club/store";
import { audioZoneAt } from "@/game/audio/world-acoustics";

export function weatherSheltered() {
  const [x, , z] = useGame.getState().playerPos;
  const club = useClub.getState();
  return (
    isHomeRoom(x, z) ||
    ["retail", "cashier", "warehouse"].includes(audioZoneAt(x, z)) ||
    !!useWarung.getState().inside ||
    !!useUsaha.getState().inside ||
    (club.inside && !club.outdoor)
  );
}
