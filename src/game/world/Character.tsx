/** @jsxImportSource @/game/jsx */
import { useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { clone as cloneSkeleton } from "three/examples/jsm/utils/SkeletonUtils.js";
import { CHAR_SCALE } from "@/game/world/layout";

export type CharacterClip =
  | "idle"
  | "walk"
  | "sprint"
  | "static"
  | "pick-up"
  | "interact-right"
  | "holding-both";

interface CharacterProps {
  url: string;
  clip?: CharacterClip;
  scale?: number;
  rotationY?: number;
  /** Kecepatan playback animasi (mis. langkah lebih cepat saat lari). */
  timeScale?: number;
}

/**
 * Karakter ber-skeleton dengan animation clip (idle / walk / sprint / pick-up).
 * Mixer dibuat sendiri di atas hasil clone supaya binding tulang
 * (leg-left, leg-right, arm-*, torso, head) selalu ketemu — kaki benar-benar
 * bergerak saat clip `walk`/`sprint` diputar.
 *
 * URL model diambil dari GAME_ASSETS, jadi GLB Toko Cung asli bisa ditukar
 * tanpa mengubah kode selama nama clip-nya sama.
 */
export function Character({
  url,
  clip = "idle",
  scale = CHAR_SCALE,
  rotationY = 0,
  timeScale = 1,
}: CharacterProps) {
  const { scene, animations } = useGLTF(url);

  const object = useMemo(() => {
    const c = cloneSkeleton(scene);
    c.traverse((child) => {
      const mesh = child as THREE.Mesh;
      if (mesh.isMesh) {
        mesh.castShadow = true;
        mesh.receiveShadow = true;
      }
    });
    return c;
  }, [scene]);

  const mixer = useMemo(() => new THREE.AnimationMixer(object), [object]);
  const current = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    const byName = (name: string) => animations.find((a) => a.name === name);
    const target = byName(clip) ?? byName("idle") ?? animations[0];
    if (!target) return;
    const next = mixer.clipAction(target);
    if (next === current.current) return;
    const prev = current.current;
    next.reset().setEffectiveWeight(1).setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.2).play();
    next.timeScale = timeScale;
    if (prev) prev.fadeOut(0.2);
    current.current = next;
  }, [mixer, animations, clip, timeScale]);

  useEffect(() => {
    if (current.current) current.current.timeScale = timeScale;
  }, [timeScale]);

  useEffect(() => {
    return () => {
      mixer.stopAllAction();
      current.current = null;
    };
  }, [mixer]);

  useFrame((_, delta) => {
    mixer.update(Math.min(delta, 0.05));
  });

  return (
    <group rotation={[0, rotationY, 0]}>
      <group scale={scale}>
        <primitive object={object} />
      </group>
    </group>
  );
}
