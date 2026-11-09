import { DISTRICTS, type DistrictId } from "./expansion-plan";
import { ROADS, SIDEWALKS, DRIVEWAYS, PARKING, subtract, type Bounds } from "./outdoor-layout";
import { surfaceContours } from "./road-geometry";
import { RoadSurface } from "./RoadSurface";
import { ROAD_STYLE } from "./road-surfaces";

const parcels = [ROADS, SIDEWALKS, [...DRIVEWAYS, ...PARKING]];
const clip = (a: Bounds, b: Bounds): Bounds => ({
  minX: Math.max(a.minX, b.minX),
  maxX: Math.min(a.maxX, b.maxX),
  minZ: Math.max(a.minZ, b.minZ),
  maxZ: Math.min(a.maxZ, b.maxZ),
});
const contours = Object.fromEntries(
  ["core", ...DISTRICTS.map((d) => d.id)].map((id) => [
    id,
    parcels.map((zones) =>
      surfaceContours(
        zones
          .flatMap((zone) =>
            id === "core"
              ? DISTRICTS.reduce((pieces, d) => pieces.flatMap((p) => subtract(p, d)), [
                  zone,
                ] as Bounds[])
              : [
                  clip(
                    zone,
                    DISTRICTS.find((d) => d.id === id)!,
                  ),
                ],
          )
          .filter((b) => b.maxX > b.minX && b.maxZ > b.minZ),
      ),
    ),
  ]),
);

export function DistrictRoadColliders({ district = "core" }: { district?: DistrictId | "core" }) {
  return (
    <>
      {contours[district]!.map((c, i) =>
        c.length > 0 ? (
          <RoadSurface
            key={i}
            name={`road-physics-${district}-${i}`}
            contours={c}
            height={[ROAD_STYLE.asphaltY, ROAD_STYLE.sidewalkY, 0.0495][i]!}
            color="#515b60"
            visible={false}
          />
        ) : null,
      )}
    </>
  );
}
