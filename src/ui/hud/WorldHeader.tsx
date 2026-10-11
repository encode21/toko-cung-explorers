import { MapPin, Sun, Moon, Users } from "lucide-react";
import { useSceneTime } from "@/game/time/scene-time";
import { useGame } from "@/state/game-store";
import { useNet } from "@/net/net-store";
import { STREET_Z, WAREHOUSE } from "@/game/world/layout";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";

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
  const { mobile } = useMobileHudLayout();

  return (
    <div
      data-hud-control
      data-world-header
      className={`pointer-events-auto flex min-w-0 items-center hud-glass ${
        mobile
          ? "w-full gap-1.5 rounded-xl px-2 py-1"
          : "max-w-xs gap-3 rounded-2xl px-3 py-2"
      }`}
    >
      <span
        className={`grid shrink-0 place-items-center bg-world-brand text-world-brand-foreground ${
          mobile ? "size-7 rounded-md" : "size-9 rounded-xl"
        }`}
      >
        <MapPin className={mobile ? "size-3.5" : "size-4"} />
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate font-display tracking-wide leading-none ${
            mobile ? "text-[13px]" : "text-lg"
          }`}
        >
          {locationName(inside, z).toUpperCase()}
        </span>
        <span
          className={`flex items-center gap-1.5 text-world-muted ${
            mobile ? "mt-0.5 text-[10px] leading-none" : "mt-1 text-[11px]"
          }`}
        >
          {!mobile && <span className="truncate">Toko Cung World</span>}
          <span className="inline-flex shrink-0 items-center gap-0.5">
            <TimeIcon className="size-3" /> {time}
          </span>
          <span className="flex shrink-0 items-center gap-0.5">
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
