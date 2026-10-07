/** @jsxImportSource @/game/jsx */
import { ZONES } from "./zones";

/** Named scene anchors are inspectable and ready for a later event engine. */
export function WorldZones() {
  return (
    <group name="MapV2-Zones">
      {ZONES.map((zone) => (
        <group
          key={zone.id}
          name={`zone-${zone.id}`}
          position={[zone.c[0], 0, zone.c[1]]}
          userData={{ zoneId: zone.id, floor: zone.floor, size: zone.s, eventsEnabled: false }}
        />
      ))}
    </group>
  );
}
