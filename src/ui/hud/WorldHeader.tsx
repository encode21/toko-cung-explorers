import { inConcert } from "@/game/club/venue-layout";
import { MapPin, Sun, Moon, Users } from "lucide-react";
import { useSceneTime } from "@/game/time/scene-time";
import { useGame } from "@/state/game-store";
import { useNet } from "@/net/net-store";
import { STREET_Z, WAREHOUSE } from "@/game/world/layout";
import { useDungeon } from "@/game/dungeon/store";
import { useClub } from "@/game/club/store";

function locationName(inside: boolean, z: number) {
  if (inside) return z < WAREHOUSE.maxZ ? "Gudang & Packing" : "Toko Utama";
  if (z > STREET_Z + 6) return "Distrik Mitra";
  if (z > STREET_Z - 4) return "Jalan Depan Toko";
  return "Halaman Toko Cung";
}

/** Header kiri atas: lokasi saat ini, waktu dunia, pemain online. */
export function WorldHeader() {
  const time = useSceneTime((s) => s.currentTime);
  const isNight = useSceneTime((s) => s.isNight);
  const TimeIcon = isNight ? Moon : Sun;
  const inside = useGame((s) => s.inside);
  const z = useGame((s) => Math.round(s.playerPos[2]));
  const online = useNet((s) => s.roster.length) || 1;
  const connected = useNet((s) => s.connected);
  const dungeonLocation = useDungeon((s) =>
    s.data?.instance && (s.data.instance.realm ?? "DUNGEON") === "DUNGEON"
      ? s.data.config.title
      : null,
  );
  const concert = useGame((s) => inConcert(s.playerPos[0]));
  const inClub = useClub((s) => s.inside);
  return (
    <div data-world-header className="mmo-location">
      <MapPin className="size-3 shrink-0 text-amber-200" aria-hidden />
      <span className="truncate">
        {dungeonLocation ||
          (inClub
            ? concert
              ? "Cung Live · Arena konser"
              : "Cung Underground"
            : locationName(inside, z))}
      </span>
      <span className="ml-auto inline-flex shrink-0 items-center gap-1">
        <TimeIcon className="size-3" aria-hidden />
        {time}
      </span>
      <span
        className="inline-flex shrink-0 items-center gap-1"
        title={connected ? "Pemain online" : "Menghubungkan"}
      >
        <span
          className={`size-1 rounded-full ${connected ? "bg-world-online" : "bg-world-accent"}`}
        />
        <Users className="size-3" aria-hidden />
        {online}
      </span>
    </div>
  );
}
