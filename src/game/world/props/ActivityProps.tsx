/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import { Fixture } from "../Fixture";
import { ACTIVITY_PROPS, PROP_SIZES, propParts } from "./activity-props";

const batch = ACTIVITY_PROPS.filter((p) => !p.assetUrl).flatMap((p) =>
  propParts(p.kind).map((part) => ({
    ...part,
    p: part.p.map((v, i) => v + p.position[i]!) as [number, number, number],
  })),
);
export function ActivityProps() {
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
