import { MapPin, Sun, Moon, Users } from "lucide-react";
import { useSceneTime } from "@/game/time/scene-time";
import { useGame } from "@/state/game-store";
import { useNet } from "@/net/net-store";
import { STREET_Z, WAREHOUSE } from "@/game/world/layout";

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

  return (
    <div
      data-hud-control
      className="pointer-events-auto flex min-w-0 max-w-xs items-center gap-3 rounded-2xl px-3 py-2 hud-glass"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-world-brand text-world-brand-foreground">
        <MapPin className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-lg leading-none tracking-wide">
          {locationName(inside, z).toUpperCase()}
        </span>
        <span className="mt-1 flex items-center gap-2 text-[11px] text-world-muted">
          <span className="truncate">Toko Cung World</span>
          <span className="hidden items-center gap-1 sm:flex">
            <TimeIcon className="size-3" /> {time}
          </span>
          <span className="flex items-center gap-1">
            <span
              className={`size-1.5 rounded-full ${connected ? "bg-world-online" : "bg-world-accent"}`}
            />
            <Users className="size-3" /> {online}
          </span>
        </span>
      </span>
    </div>
  );
}
