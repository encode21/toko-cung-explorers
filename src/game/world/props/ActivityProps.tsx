/** @jsxImportSource @/game/jsx */
import { useMemo } from "react";
import { parcelCount, useReactiveWorld } from "@/game/reactive-world/store";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import { Fixture } from "../Fixture";
import { ACTIVITY_PROPS, PROP_SIZES, propParts } from "./activity-props";

function makeBatch(boxes: number) {
  return ACTIVITY_PROPS.filter((p) => !p.assetUrl).flatMap((p) =>
    propParts(p.kind, p.id === "warehouse-parcels" ? boxes : 3).map((part) => ({
      ...part,
      p: part.p.map((v, i) => v + p.position[i]!) as [number, number, number],
    })),
  );
}
export function ActivityProps() {
  const boxes = useReactiveWorld((s) =>
    s.warehouse > 0.05
      ? parcelCount(
          s.warehouse,
          s.events.find((e) => e.type === "WAREHOUSE_RUSH")?.payload.parcelTier,
        )
      : 3,
  );
  const batch = useMemo(() => makeBatch(boxes), [boxes]);
  return (
    <group name="StoreAmbientProps">
      <StyledBatch items={batch} />
      {ACTIVITY_PROPS.map((p) => {
        const s = PROP_SIZES[p.kind];
        return (
          <group
            key={p.id}
            name={p.id}
            position={p.position}
            userData={{ propKind: p.kind, zone: p.zone }}
          >
            {p.assetUrl && (
              <Fixture assetUrl={p.assetUrl} height={s[1]}>
                <StyledBatch items={propParts(p.kind)} />
              </Fixture>
            )}
            {p.position[1] === 0 && (
              <RigidBody type="fixed" colliders={false}>
                <CuboidCollider args={[s[0] / 2, s[1] / 2, s[2] / 2]} position={[0, s[1] / 2, 0]} />
              </RigidBody>
            )}
          </group>
        );
      })}
    </group>
  );
}
