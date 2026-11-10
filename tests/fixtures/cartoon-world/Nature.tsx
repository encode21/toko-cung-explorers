/** @jsxImportSource @/game/jsx */
import { useState } from "react";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { WaterEffects } from "@/game/swimming/WaterEffects";
import { WaterMaterial } from "@/game/swimming/WaterMaterial";
import { FISHING_WATER, WATER_BODIES, waterAt } from "@/game/swimming/model";
import { Trees } from "@/game/world/Foliage";
import { useAudioSettings, audioAudible, audioBus } from "@/game/audio/audio-manager";
import { resumeAudioContext } from "@/game/audio/audio-context";
const spots = [
  { x: 32, z: -38, seed: 1, scale: 1.4 },
  { x: 50, z: -34, seed: 2 },
  { x: 35, z: -51, palm: true, scale: 1.4 },
];
export function Nature() {
  const [animations, setAnimations] = useState(["Idle", "Idle"]);
  const [actors, setActors] = useState([
    [55, 0, -45],
    [55, 0, -43],
  ]);
  const qa = (window as any).qa;
  qa.jump = (index: number, animation: string) =>
    setAnimations((old) => old.map((value, i) => i === index ? animation : value));
  qa.move = (index: number, wet: boolean) =>
    setActors((old) =>
      old.map((p, i) =>
        i === index
          ? [wet ? 52.5 : 55, wet ? waterAt(52.5, -45 + index * 2)!.floor : 0, -45 + index * 2]
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
        position={[FISHING_WATER.x, FISHING_WATER.surface, FISHING_WATER.z]}
        rotation-x={-Math.PI / 2}
        scale={[FISHING_WATER.rx, FISHING_WATER.rz, 1]}
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
