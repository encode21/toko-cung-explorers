/** @jsxImportSource @/game/jsx */
import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  MathUtils,
  Shape,
  Vector3,
  type Group,
  type Object3D,
  type MeshBasicMaterial,
} from "three";
import { PLAYER_VISUAL_DROP } from "@/game/world/street-props";
import { useGame } from "@/state/game-store";
import { useDungeon } from "@/game/dungeon/store";
import { resolveObjective } from "@/game/editor/resolve";
import { worldLandmarkFor } from "@/game/world/landmarks";
import { useGameCore } from "./store";
import { questGuidanceTarget } from "./quest-guidance";
import { guidanceAngle, guidanceDirectionVisible } from "./guidance-motion";

// A narrow, open chevron. Local -Y maps to world +Z on the ground plane.
const pointer = new Shape();
pointer.moveTo(0, -1.65);
pointer.lineTo(-0.3, -1.24);
pointer.lineTo(-0.22, -1.2);
pointer.lineTo(0, -1.49);
pointer.lineTo(0.22, -1.2);
pointer.lineTo(0.3, -1.24);
pointer.closePath();

const pointerEdge = new Shape();
pointerEdge.moveTo(0, -1.71);
pointerEdge.lineTo(-0.36, -1.22);
pointerEdge.lineTo(-0.21, -1.15);
pointerEdge.lineTo(0, -1.42);
pointerEdge.lineTo(0.21, -1.15);
pointerEdge.lineTo(0.36, -1.22);
pointerEdge.closePath();

const vertexShader = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;
// Analytic feathering: soft halo without textures, bloom passes or dynamic lights.
const fragmentShader = `
  varying vec2 vUv;
  uniform float strength;
  void main() {
    float d = abs(length((vUv - 0.5) * 2.0) - 0.76);
    float line = 1.0 - smoothstep(0.012, 0.032, d);
    float edge = 1.0 - smoothstep(0.033, 0.062, d);
    float glow = 1.0 - smoothstep(0.015, 0.13, d);
    // A narrow charcoal keyline retains contrast on bright concrete and grass.
    float alpha = (edge * 0.76 + glow * glow * 0.12) * strength;
    vec3 color = mix(vec3(0.10, 0.16, 0.18), vec3(1.0, 0.85, 0.48), line);
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Render-only guidance. Read the interpolated player object instead of the
 * 150ms gameplay/network snapshot; never write to the canonical player transform.
 * Depth-independent marks remain visible over raised road paint and sidewalks.
 */
export function QuestGuidance() {
  const snapshot = useGameCore((s) => s.snapshot);
  const dungeon = useDungeon((s) => s.data);
  const target = questGuidanceTarget(snapshot, dungeon);
  const feet = useRef<Group>(null);
  const arrow = useRef<Group>(null);
  const halo = useRef<Group>(null);
  const arrowEdgeMaterial = useRef<MeshBasicMaterial>(null);
  const arrowMaterial = useRef<MeshBasicMaterial>(null);
  const player = useRef<Object3D | null>(null);
  const livePosition = useMemo(() => new Vector3(), []);
  const initialized = useRef(false);
  const directionVisible = useRef(false);
  const arrowOpacity = useRef(0);
  const footUniforms = useMemo(() => ({ strength: { value: 1 } }), []);
  const haloUniforms = useMemo(() => ({ strength: { value: 0.82 } }), []);

  useFrame(({ clock, scene }, rawDelta) => {
    if (!target || !feet.current || !arrow.current || !halo.current) {
      initialized.current = false;
      return;
    }
    const resolved = target.objective ? resolveObjective(target.objective) : null;
    const position = resolved
      ? target.realm === "WORLD" && !resolved.targetId
        ? worldLandmarkFor(resolved.target, resolved.position)
        : resolved.position
      : target.position;
    const valid = position?.length === 3 && position.every(Number.isFinite);
    feet.current.visible = halo.current.visible = valid;
    if (!valid) {
      initialized.current = false;
      return;
    }

    if (!player.current?.parent) player.current = scene.getObjectByName("Player") ?? null;
    if (player.current) player.current.getWorldPosition(livePosition);
    else livePosition.fromArray(useGame.getState().playerPos);
    livePosition.y -= PLAYER_VISUAL_DROP - 0.055;
    const delta = Math.min(rawDelta, 0.05);
    // Teleports/realm changes must not leave a trail across the world.
    const reset =
      !initialized.current || feet.current.position.distanceToSquared(livePosition) > 36;
    if (reset) feet.current.position.copy(livePosition);
    else feet.current.position.lerp(livePosition, 1 - Math.exp(-32 * delta));

    // Aim from the rendered indicator, not a stale simulation snapshot.
    const dx = position[0] - feet.current.position.x;
    const dz = position[2] - feet.current.position.z;
    const distance = Math.hypot(dx, dz);
    directionVisible.current = guidanceDirectionVisible(distance, directionVisible.current);
    if (directionVisible.current) {
      const heading = Math.atan2(dx, dz);
      arrow.current.rotation.y = reset
        ? heading
        : guidanceAngle(arrow.current.rotation.y, heading, delta);
    }
    const opacity = directionVisible.current ? MathUtils.smoothstep(distance, 0.8, 1.8) * 0.85 : 0;
    arrowOpacity.current = MathUtils.damp(arrowOpacity.current, opacity, 14, delta);
    arrow.current.visible = arrowOpacity.current > 0.01;
    if (arrowMaterial.current) arrowMaterial.current.opacity = arrowOpacity.current;
    if (arrowEdgeMaterial.current) arrowEdgeMaterial.current.opacity = arrowOpacity.current * 0.88;
    initialized.current = true;

    halo.current.position.set(position[0], position[1] + 0.08, position[2]);
    // Continuous sine pulse has no expanding-ring reset/pop.
    const breath = Math.sin(clock.elapsedTime * 1.8);
    halo.current.scale.setScalar(1 + breath * 0.025);
    haloUniforms.strength.value = 0.82 + breath * 0.05;
  });

  if (!target) return null;
  return (
    <group>
      <group name="quest-foot-guidance" ref={feet} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={19}>
          <planeGeometry args={[2.3, 2.3]} />
          <shaderMaterial
            uniforms={footUniforms}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <group name="quest-direction" ref={arrow}>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={19}>
            <shapeGeometry args={[pointerEdge]} />
            <meshBasicMaterial
              ref={arrowEdgeMaterial}
              color="#19292e"
              transparent
              opacity={0}
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={20}>
            <shapeGeometry args={[pointer]} />
            <meshBasicMaterial
              ref={arrowMaterial}
              color="#ffdc83"
              transparent
              opacity={0}
              depthTest={false}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>
        </group>
      </group>
      <group name="quest-objective-halo" ref={halo} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={18}>
          <planeGeometry args={[2.6, 2.6]} />
          <shaderMaterial
            uniforms={haloUniforms}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            transparent
            depthTest={false}
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
