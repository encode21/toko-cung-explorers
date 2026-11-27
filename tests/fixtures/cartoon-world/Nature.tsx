/** @jsxImportSource @/game/jsx */
import { CITY_LAKE } from "@/game/world/expansion-plan";
import { useState } from "react";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { WaterEffects } from "@/game/swimming/WaterEffects";
import { WaterMaterial } from "@/game/swimming/WaterMaterial";
import { WATER_BODIES, waterAt } from "@/game/swimming/model";
import { Trees } from "@/game/world/Foliage";
import { useAudioSettings, audioAudible, audioBus } from "@/game/audio/audio-manager";
import { resumeAudioContext } from "@/game/audio/audio-context";
const spots = [
  { x: 96, z: 95, seed: 1, scale: 1.4 },
  { x: 122, z: 99, seed: 2 },
  { x: 99, z: 82, palm: true, scale: 1.4 },
];
export function Nature() {
  const [animations, setAnimations] = useState(["Idle", "Idle"]);
  const [actors, setActors] = useState([
    [120, 0, 88],
    [120, 0, 90],
  ]);
  const qa = (window as any).qa;
  qa.jump = (index: number, animation: string) =>
    setAnimations((old) => old.map((value, i) => i === index ? animation : value));
  qa.move = (index: number, wet: boolean) =>
    setActors((old) =>
      old.map((p, i) =>
        i === index
          ? [wet ? 116.5 : 120, wet ? waterAt(116.5, 88 + index * 2)!.floor : 0, 88 + index * 2]
          : p,
      ),
    );
  qa.audio = {
    unlock: resumeAudioContext,
    settings: useAudioSettings,
    audible: audioAudible,
    gain: () => audioBus("sfx").gain.value,
  };
  return (
    <>
      <Trees spots={spots} />
      <WaterEffects />
      <mesh
        position={[CITY_LAKE.x, CITY_LAKE.surface, CITY_LAKE.z]}
        rotation-x={-Math.PI / 2}
        scale={[CITY_LAKE.rx, CITY_LAKE.rz, 1]}
      >
        <circleGeometry args={[1, 48]} />
        <WaterMaterial body={WATER_BODIES[1]!} />
      </mesh>
      {actors.map((p, i) => (
        <group key={i} name={`effect-avatar-${i}`} position={p as [number, number, number]}>
          <BaseAvatarV2
            playerAvatar
            animation={animations[i] as "Idle" | "Jump" | "JumpLand"}
          />
        </group>
      ))}
    </>
  );
}
