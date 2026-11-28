/** @jsxImportSource @/game/jsx */
import { VehicleModel } from "@/game/traffic/VehicleModel";
import { NIAGA_DISPLAY } from "./niaga";

/** Pajangan visual di depan Cung Niaga (tanpa collider, tidak bisa dikendarai). */
export function NiagaDisplay() {
  return (
    <group>
      {NIAGA_DISPLAY.map((v) => (
        <group key={v.kind} position={[v.x, 0, v.z]} rotation-y={Math.PI / 2}>
          <VehicleModel kind={v.kind} color={v.color} emptyBed />
        </group>
      ))}
    </group>
  );
}
