/** @jsxImportSource @/game/jsx */
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { StyledBatch } from "@/game/assets/StyledBatch";
import { Fixture } from "../Fixture";
import { StoreInteriorVisibility } from "../StoreInteriorVisibility";
import { isStoreInterior } from "../layout";
import { ACTIVITY_PROPS, PROP_SIZES, propParts, type ActivityProp } from "./activity-props";

function makeBatch(props: ActivityProp[]) {
  return props
    .filter((p) => !p.assetUrl)
    .flatMap((p) =>
      propParts(p.kind).map((part) => ({
        ...part,
        p: part.p.map((v, i) => v + p.position[i]!) as [number, number, number],
      })),
    );
}
const interiorProps = ACTIVITY_PROPS.filter((prop) => isStoreInterior(...prop.position));
const exteriorProps = ACTIVITY_PROPS.filter((prop) => !isStoreInterior(...prop.position));
const interiorBatch = makeBatch(interiorProps);
const exteriorBatch = makeBatch(exteriorProps);

export function ActivityProps() {
  return (
    <group name="StoreAmbientProps">
      <StyledBatch items={exteriorBatch} />
      <StoreInteriorVisibility name="TokoCung-IndoorProps">
        <StyledBatch items={interiorBatch} />
      </StoreInteriorVisibility>
      {ACTIVITY_PROPS.map((p) => {
        const s = PROP_SIZES[p.kind];
        const visual = p.assetUrl && (
          <Fixture assetUrl={p.assetUrl} height={s[1]}>
            <StyledBatch items={propParts(p.kind)} />
          </Fixture>
        );
        return (
          <group
            key={p.id}
            name={p.id}
            position={p.position}
            userData={{ propKind: p.kind, zone: p.zone }}
          >
            {visual &&
              (isStoreInterior(...p.position) ? (
                <StoreInteriorVisibility name={p.id + "-visuals"}>{visual}</StoreInteriorVisibility>
              ) : (
                visual
              ))}
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
