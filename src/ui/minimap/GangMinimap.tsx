import { useEffect, useRef } from "react";
import { GANG_HALTE_LOCAL, gangName, housePose, sameGang } from "@/game/gang/model";
import { KALI, LAND_HALF, LAND_START } from "@/game/gang/beach";
import { useGang } from "@/game/gang/store";
import { remoteStates } from "@/net/useWorldChannel";
import { useGame } from "@/state/game-store";
import { MAP_PALETTE as MAP } from "./map-palette";

interface GangMinimapProps {
  size: number;
  height?: number | undefined;
  range: number;
  follow?: boolean | undefined;
  round?: boolean | undefined;
  centerX?: number | undefined;
  centerZ?: number | undefined;
}

/** Kampung HUD map using the same follow, palette and markers as the city canvas. */
export function GangMinimap({
  size,
  height = size,
  range,
  follow = true,
  round = false,
  centerX,
  centerZ,
}: GangMinimapProps) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const data = useGang((state) => state.data);

  useEffect(() => {
    const element = canvas.current;
    if (!element || !data || size <= 0 || height <= 0 || range <= 0) return;
    const context = element.getContext("2d");
    if (!context) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    element.width = Math.round(size * dpr);
    element.height = Math.round(height * dpr);
    const [originX, , originZ] = data.layout.origin;
    const end = Math.ceil(data.houses.length / 2) * data.layout.house_spacing + 10;
    let frame = 0;
    let last = 0;

    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      if (time - last < 66) return;
      last = time;
      const { playerPos, playerYaw } = useGame.getState();
      const cx = follow ? playerPos[0] : (centerX ?? originX);
      const cz = follow ? playerPos[2] : (centerZ ?? originZ + (LAND_START + end) / 2);
      const scale = Math.min(size, height) / range;
      const x = (localX: number) => (originX + localX - cx) * scale + size / 2;
      const y = (localZ: number) => (originZ + localZ - cz) * scale + height / 2;
      const rect = (minX: number, minZ: number, maxX: number, maxZ: number) =>
        [x(minX), y(minZ), (maxX - minX) * scale, (maxZ - minZ) * scale] as const;

      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      context.clearRect(0, 0, size, height);
      context.fillStyle = MAP.water;
      context.fillRect(0, 0, size, height);
      context.fillStyle = MAP.sand;
      context.fillRect(...rect(-LAND_HALF - 4, LAND_START - 4, LAND_HALF + 4, end + 4));
      context.fillStyle = MAP.ground;
      context.fillRect(...rect(-LAND_HALF, LAND_START, LAND_HALF, end));

      context.fillStyle = "#75b7c5";
      context.fillRect(...rect(KALI.x0, LAND_START, KALI.x1, end));
      context.fillStyle = MAP.driveway;
      for (const house of data.houses) {
        const pose = housePose(house.number, data.layout);
        context.fillRect(
          ...rect(pose.x < 0 ? -10 : 5.4, pose.z - 2, pose.x < 0 ? -5.4 : 10, pose.z + 2),
        );
      }
      context.fillStyle = MAP.walk;
      context.fillRect(...rect(-5.4, LAND_START, -3.2, end));
      context.fillRect(...rect(3.2, LAND_START, 5.4, end));
      context.fillStyle = MAP.road;
      context.fillRect(...rect(-3.2, LAND_START, 3.2, end));
      context.strokeStyle = MAP.crosswalk;
      context.lineWidth = Math.max(1, scale * 0.14);
      context.setLineDash([3 * scale, 3 * scale]);
      context.beginPath();
      context.moveTo(x(0), y(LAND_START));
      context.lineTo(x(0), y(end));
      context.stroke();
      context.setLineDash([]);

      for (const house of data.houses) {
        const pose = housePose(house.number, data.layout);
        const depth = house.warung?.level === 5 && house.warung.lot === null ? 14 : 10;
        const bounds = rect(pose.x - 4.5, pose.z - depth / 2, pose.x + 4.5, pose.z + depth / 2);
        context.fillStyle = house.inactive ? "#c7c6bd" : house.mine ? "#c2d3ad" : MAP.store;
        context.strokeStyle = house.mine ? "#417b60" : MAP.storeLine;
        context.lineWidth = 1.2;
        context.fillRect(...bounds);
        context.strokeRect(...bounds);
        context.strokeStyle = "#fffbea99";
        context.beginPath();
        context.moveTo(bounds[0] + 2, bounds[1] + bounds[3] / 2);
        context.lineTo(bounds[0] + bounds[2] - 2, bounds[1] + bounds[3] / 2);
        context.stroke();
        if (house.warung?.open) {
          context.fillStyle = "#24884a";
          context.beginPath();
          context.arc(x(pose.x + 3.6), y(pose.z - depth / 2 + 1.2), 2.4, 0, Math.PI * 2);
          context.fill();
          context.strokeStyle = "#fffdf3";
          context.lineWidth = 1;
          context.stroke();
        }
      }

      const [halteX, , halteZ] = GANG_HALTE_LOCAL;
      context.fillStyle = "#fffdf3";
      context.strokeStyle = MAP.place;
      context.lineWidth = 1.5;
      context.beginPath();
      context.arc(x(halteX), y(halteZ), 6, 0, Math.PI * 2);
      context.fill();
      context.stroke();
      context.fillStyle = MAP.place;
      context.font = "800 7px system-ui, sans-serif";
      context.textAlign = "center";
      context.textBaseline = "middle";
      context.fillText("H", x(halteX), y(halteZ) + 0.5);

      context.fillStyle = MAP.remote;
      for (const remote of remoteStates.values()) {
        if (!sameGang(data.gang, remote.gangId)) continue;
        context.beginPath();
        context.arc(
          (remote.x - cx) * scale + size / 2,
          (remote.z - cz) * scale + height / 2,
          3,
          0,
          Math.PI * 2,
        );
        context.fill();
        context.strokeStyle = "#fffdf3";
        context.lineWidth = 1;
        context.stroke();
      }

      context.save();
      context.translate(
        (playerPos[0] - cx) * scale + size / 2,
        (playerPos[2] - cz) * scale + height / 2,
      );
      context.rotate(-playerYaw + Math.PI);
      context.fillStyle = MAP.player;
      context.strokeStyle = "#fff";
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(0, -7);
      context.lineTo(5, 5);
      context.lineTo(0, 2.5);
      context.lineTo(-5, 5);
      context.closePath();
      context.stroke();
      context.fill();
      context.restore();
    };

    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [centerX, centerZ, data, follow, height, range, size]);

  if (!data) return null;
  return (
    <canvas
      ref={canvas}
      style={{ width: size, height }}
      className={round ? "rounded-full" : "rounded-xl"}
      aria-label={`Peta ${gangName(data)}`}
    />
  );
}
