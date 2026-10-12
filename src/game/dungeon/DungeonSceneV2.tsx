/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { RigidBody, CuboidCollider } from "@react-three/rapier";
import { FacilityEnvironment } from "./FacilityEnvironment";
import { WarehouseDetails } from "./WarehouseDetails";
import { DungeonStaff } from "./DungeonStaff";
import { useDungeon } from "./store";
type Vec = [number, number, number];
function Block({
  p,
  size,
  color = "#617777",
  solid = true,
}: {
  p: Vec;
  size: Vec;
  color?: string;
  solid?: boolean;
}) {
  const mesh = (
    <mesh position={solid ? [0, 0, 0] : p} castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
  return solid ? (
    <RigidBody type="fixed" position={p} colliders="cuboid">
      {mesh}
    </RigidBody>
  ) : (
    mesh
  );
}
function Sign({ p, text, size = 0.38 }: { p: Vec; text: string; size?: number }) {
  return (
    <Text
      position={p}
      fontSize={size}
      color="#ffe6a5"
      maxWidth={7}
      textAlign="center"
      outlineWidth={0.012}
      outlineColor="#152c36"
    >
      {text}
    </Text>
  );
}
function Shelf({ x, z }: { x: number; z: number }) {
  return (
    <group>
      <Block p={[x, 0.12, z]} size={[2.2, 0.24, 4.5]} color="#233c46" />
      {[-0.95, 0.95].flatMap((dx) =>
        [-2, 2].map((dz) => (
          <Block
            key={`${dx}-${dz}`}
            p={[x + dx, 1.8, z + dz]}
            size={[0.12, 3.6, 0.12]}
            color="#df9a50"
          />
        )),
      )}
      {[0.8, 2, 3.2].map((y) => (
        <group key={y}>
          <Block p={[x, y, z]} size={[2.2, 0.12, 4.5]} color="#73888c" />
          {[-1.35, 0, 1.35].map((dz) => (
            <Block
              key={dz}
              p={[x, y + 0.43, z + dz]}
              size={[1.6, 0.75, 1.05]}
              color={dz ? "#967251" : "#c29c69"}
            />
          ))}
        </group>
      ))}
    </group>
  );
}
/** The two floors and opaque partitions deliberately break the view into separate rooms. */
export function DungeonSceneV2() {
  const data = useDungeon((s) => s.data);
  if (!data?.instance) return null;
  const { config: c, instance: i } = data;
  const next = c.objectives.findIndex((o, n) => (i.progress[n] ?? 0) < o.required);
  return (
    <group>
      <WarehouseDetails />
      <FacilityEnvironment />
      <ambientLight intensity={0.55} />
      <hemisphereLight args={["#d6edff", "#454b40", 0.95]} />
      <directionalLight position={[6, 16, 12]} intensity={1.5} />
      <Block p={[0, 10.6, 0]} size={[36, 0.2, 36]} color="#89928b" />
      <Block p={[0, -0.2, 0]} size={[36, 0.4, 36]} color="#536269" />
      <Block p={[0, 5.2, -18]} size={[36, 10.4, 0.35]} />
      <Block p={[-18, 5.2, 0]} size={[0.35, 10.4, 36]} />
      <Block p={[18, 5.2, 0]} size={[0.35, 10.4, 36]} />
      <Block p={[0, 2.5, 18]} size={[36, 5, 0.35]} />
      {/* Mezzanine with an open stair landing on the east side. */}
      <Block p={[7.5, 3.82, -9]} size={[19, 0.36, 16]} color="#6d797c" />
      <Block p={[-0.6, 3.82, 1]} size={[2.8, 0.36, 6]} color="#6d797c" />
      <Block p={[5.5, 5.8, -7]} size={[0.25, 3.6, 9]} color="#2f5058" />
      <Block p={[2, 5.8, -6]} size={[6.5, 3.6, 0.25]} color="#2f5058" />
      <Block p={[10, 5.8, -6]} size={[3, 3.6, 0.25]} color="#2f5058" />
      <Block p={[16.2, 5.8, -6]} size={[1.5, 3.6, 0.25]} color="#2f5058" />
      {/* Smooth collider under visible stair treads: walking works without jumping. */}
      <RigidBody
        type="fixed"
        colliders="cuboid"
        position={[14, 1.9, 3]}
        rotation={[Math.atan(0.5), 0, 0]}
      >
        <mesh>
          <boxGeometry args={[3.4, 0.2, Math.sqrt(80)]} />
          <meshStandardMaterial color="#79898d" />
        </mesh>
      </RigidBody>
      {Array.from({ length: 16 }, (_, n) => (
        <Block
          key={n}
          p={[14, n * 0.25 + 0.04, 6.75 - n * 0.5]}
          size={[3.4, 0.08, 0.5]}
          color={n % 2 ? "#79898d" : "#b5b7a8"}
          solid={false}
        />
      ))}
      {[-1, 1].map((side) => (
        <group key={side}>
          <RigidBody
            type="fixed"
            colliders="cuboid"
            position={[14 + side * 1.8, 2.8, 3]}
            rotation={[Math.atan(0.5), 0, 0]}
          >
            <mesh>
              <boxGeometry args={[0.12, 1.3, Math.sqrt(80)]} />
              <meshStandardMaterial color="#d8a951" />
            </mesh>
          </RigidBody>
        </group>
      ))}
      <RigidBody type="fixed" colliders={false}>
        {[-2, 0.8].map((x) => (
          <CuboidCollider key={x} position={[x, 4.5, 1]} args={[0.06, 0.5, 3]} />
        ))}
        <CuboidCollider position={[6, 4.5, -2]} args={[6, 0.5, 0.06]} />
      </RigidBody>
      {/* Tall ground-floor partitions; aisles offer several exploration routes. */}
      <Block p={[-4, 1.9, -11]} size={[0.3, 3.8, 12]} />
      <Block p={[-4, 1.9, 1]} size={[0.3, 3.8, 6]} />
      <Block p={[-11, 1.9, 4]} size={[14, 3.8, 0.3]} />
      <Block p={[-16, 1.9, -12]} size={[4, 3.8, 0.3]} />
      <Block p={[-10, 1.9, -12]} size={[2, 3.8, 0.3]} />
      <Block p={[-10, 1.9, -15]} size={[0.3, 3.8, 6]} />
      <Shelf x={-15} z={-4} />
      <Shelf x={-10} z={-4} />
      <Shelf x={-6} z={-9} />
      <Block p={[-10, 0.5, 11.6]} size={[4, 1, 1.2]} color="#a17d53" />
      <Block p={[8, 0.5, -10.5]} size={[3, 1, 1.2]} color="#a17d53" />
      <Block p={[8, 4.55, -10.5]} size={[3, 1.1, 1.4]} color="#a17d53" />
      <Block p={[2, 4.5, -11.5]} size={[3, 1, 1.2]} color="#a17d53" />
      <Block p={[10, 0.5, 9.5]} size={[3, 1, 1.2]} color="#a17d53" />
      <Block p={[8, 0.55, 14.7]} size={[4, 1.1, 1.1]} color="#168b91" />
      {[7, 10, 13].map((x) => (
        <Block key={x} p={[x, 0.6, 1]} size={[2, 1.2, 2]} color="#bd9869" />
      ))}
      <Sign p={[8, 7, -17.6]} text="DISTRIBUTION OFFICE" size={0.6} />
      <Sign p={[-10, 3, -17.7]} text="STORAGE B" size={0.32} />
      {/* Coordinator stays visible; clues are revealed by their own data dependencies. */}
      <DungeonStaff />
      {c.objectives.map((o, n) =>
        n <= next &&
        o.realm !== "WORLD" &&
        o.type !== "TALK" &&
        o.type !== "VISIT" &&
        o.type !== "EXPLORE" ? (
          <group key={n} position={o.position}>
            {o.type === "COLLECT" ? (
              <group>
                <mesh position={[0, 0.35, 0]}>
                  <boxGeometry args={[0.65, 0.65, 0.65]} />
                  <meshStandardMaterial color="#b78c5e" />
                </mesh>
                <mesh position={[0, 0.69, 0]}>
                  <boxGeometry args={[0.14, 0.025, 0.66]} />
                  <meshStandardMaterial color="#e0c694" />
                </mesh>
                <mesh position={[0, 0.4, 0.331]}>
                  <planeGeometry args={[0.28, 0.19]} />
                  <meshStandardMaterial color="#ded5b9" />
                </mesh>
              </group>
            ) : (
              <group position={[0, 0, -0.8]}>
                {o.type === "SCAN" && (
                  <mesh position={[0, 0.53, 0]}>
                    <boxGeometry args={[0.65, 1.06, 0.55]} />
                    <meshStandardMaterial color="#405d67" />
                  </mesh>
                )}
                <mesh position={[0, 1.135, 0]}>
                  <boxGeometry args={[0.38, 0.025, 0.45]} />
                  <meshStandardMaterial color="#ded5b9" />
                </mesh>
                {[0, 1, 2].map((line) => (
                  <mesh key={line} position={[0, 1.151, -0.1 + line * 0.08]}>
                    <boxGeometry args={[0.25, 0.005, 0.018]} />
                    <meshStandardMaterial color="#75705e" />
                  </mesh>
                ))}
              </group>
            )}
          </group>
        ) : null,
      )}
      {!i.easterEgg &&
        c.easterEggs.map((egg) => (
          <mesh key={egg.id} position={[egg.position[0], egg.position[1] + 0.2, egg.position[2]]}>
            <cylinderGeometry args={[0.15, 0.15, 0.12, 12]} />
            <meshStandardMaterial color="#a38b54" />
          </mesh>
        ))}
      {/* Paint guides public circulation, not secret objects. */}
      {[0, 8].map((x) => (
        <Block key={x} p={[x, 0.012, 9]} size={[0.18, 0.02, 10]} color="#d8aa57" solid={false} />
      ))}
    </group>
  );
}
