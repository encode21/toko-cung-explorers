/** @jsxImportSource @/game/jsx */
import { beachApproach } from "@/game/swimming/model";
import { fishingApproach } from "@/game/fishing/model";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import {
  MathUtils,
  BufferGeometry,
  Color,
  DynamicDrawUsage,
  Float32BufferAttribute,
  InstancedBufferAttribute,
  Object3D,
  Vector3,
  type Group,
  type InstancedMesh,
  type ShaderMaterial,
} from "three";
import { avatarSurfaceY } from "@/game/avatar/grounding";
import { ROAD_STYLE } from "@/game/world/road-surfaces";
import { PLAYER_VISUAL_DROP } from "@/game/world/street-props";
import { useGame } from "@/state/game-store";
import { resolveObjective } from "@/game/editor/resolve";
import { worldLandmarkFor } from "@/game/world/landmarks";
import { guidanceAngle, guidanceDirectionVisible } from "./guidance-motion";
import { GUIDANCE_TRAIL, guidanceTrailDistance, guidanceTrailOpacity } from "./guidance-trail";
import { useWorldGuidanceTarget } from "./use-world-guidance";

function createTrailGeometry() {
  // Orange centre and white border share one plane, avoiding layered z-fighting.
  // Local -Y maps to forward +Z when laid on the ground.
  const outer = [
    [0, -0.48],
    [0.42, 0.3],
    [-0.42, 0.3],
  ] as const;
  const inner = [
    [0, -0.35],
    [0.3, 0.23],
    [-0.3, 0.23],
  ] as const;
  const vertices: number[] = [];
  const colors: number[] = [];
  const white = new Color("#fffaf0");
  const orange = new Color("#ff965d");
  const triangle = (points: readonly (readonly [number, number])[], color: Color) => {
    for (const point of points) {
      vertices.push(point[0], point[1], 0);
      colors.push(color.r, color.g, color.b);
    }
  };
  for (let i = 0; i < 3; i++) {
    const next = (i + 1) % 3;
    triangle([outer[i]!, outer[next]!, inner[next]!], white);
    triangle([outer[i]!, inner[next]!, inner[i]!], white);
  }
  triangle(inner, orange);
  const geometry = new BufferGeometry();
  geometry.setAttribute("position", new Float32BufferAttribute(vertices, 3));
  geometry.setAttribute("color", new Float32BufferAttribute(colors, 3));
  geometry.setAttribute(
    "trailOpacity",
    new InstancedBufferAttribute(new Float32Array(GUIDANCE_TRAIL.count), 1).setUsage(
      DynamicDrawUsage,
    ),
  );
  return geometry;
}

const trailVertexShader = `
  attribute vec3 color;
  attribute float trailOpacity;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    vColor = color;
    vOpacity = trailOpacity;
    gl_Position = projectionMatrix * modelViewMatrix * instanceMatrix * vec4(position, 1.0);
  }
`;
const trailFragmentShader = `
  uniform float strength;
  varying vec3 vColor;
  varying float vOpacity;
  void main() {
    float alpha = vOpacity * strength;
    if (alpha < 0.005) discard;
    gl_FragColor = vec4(vColor, alpha);
    #include <colorspace_fragment>
  }
`;

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
 * Marks depth-test against characters/props, with a small surface clearance.
 */
function guidanceGroundY(floorY: number) {
  // Outdoor physics is flat while pavement/road paint is raised visually.
  // Keep the decal above those surfaces without disabling object occlusion.
  return floorY > -0.1 && floorY < 0.15
    ? Math.max(floorY + 0.025, ROAD_STYLE.sidewalkY + 0.025)
    : floorY + 0.025;
}

export function QuestGuidance() {
  const muted = useGame((s) => s.guidanceMuted);
  const target = useWorldGuidanceTarget();
  const feet = useRef<Group>(null);
  const arrow = useRef<Group>(null);
  const halo = useRef<Group>(null);
  const trail = useRef<InstancedMesh>(null);
  const trailMaterial = useRef<ShaderMaterial>(null);
  const haloMaterial = useRef<ShaderMaterial>(null);
  const trailGeometry = useMemo(createTrailGeometry, []);
  const marker = useMemo(() => {
    const object = new Object3D();
    object.rotation.x = -Math.PI / 2;
    return object;
  }, []);
  const groundPoint = useMemo(() => ({ x: 0, z: 0 }), []);
  const reducedMotion = useRef(false);
  const player = useRef<Object3D | null>(null);
  const livePosition = useMemo(() => new Vector3(), []);
  const initialized = useRef(false);
  const directionVisible = useRef(false);
  const arrowOpacity = useRef(0);
  const footUniforms = useMemo(() => ({ strength: { value: 1 } }), []);
  const haloUniforms = useMemo(() => ({ strength: { value: 0.82 } }), []);
  const trailUniforms = useMemo(() => ({ strength: { value: 0 } }), []);

  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      reducedMotion.current = preference.matches;
    };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  useEffect(() => () => trailGeometry.dispose(), [trailGeometry]);

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
      : useGame.getState().waypoint === "venue-beach"
        ? beachApproach(useGame.getState().playerPos)
        : useGame.getState().waypoint === "venue-fishing"
          ? fishingApproach(useGame.getState().playerPos)
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
    // Outdoor guidance stays on the ground when the player jumps.
    livePosition.y = guidanceGroundY(
      target.realm === "WORLD" ? 0 : livePosition.y - PLAYER_VISUAL_DROP,
    );
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
    const opacity = directionVisible.current ? MathUtils.smoothstep(distance, 0.8, 1.8) * 0.98 : 0;
    arrowOpacity.current = MathUtils.damp(arrowOpacity.current, opacity, 14, delta);
    arrow.current.visible = arrowOpacity.current > 0.01;
    // R3F copies supplied uniform descriptors; animate the mounted material's uniforms.
    const trailStrength = trailMaterial.current?.uniforms["strength"];
    if (trailStrength) trailStrength.value = arrowOpacity.current;
    if (trail.current) {
      const heading = arrow.current.rotation.y;
      const sin = Math.sin(heading);
      const cos = Math.cos(heading);
      const alphas = trailGeometry.getAttribute("trailOpacity") as InstancedBufferAttribute;
      for (let index = 0; index < GUIDANCE_TRAIL.count; index++) {
        const along = guidanceTrailDistance(
          index,
          reducedMotion.current ? 0.4 : clock.elapsedTime,
          distance,
        );
        groundPoint.x = feet.current.position.x + sin * along;
        groundPoint.z = feet.current.position.z + cos * along;
        // Include raised crosswalk / loading-bay paint as well as the paving itself.
        const y =
          target.realm === "WORLD"
            ? Math.max(0.13, avatarSurfaceY(groundPoint) + 0.025) - feet.current.position.y
            : 0;
        marker.position.set(0, y, along);
        marker.updateMatrix();
        trail.current.setMatrixAt(index, marker.matrix);
        alphas.setX(index, guidanceTrailOpacity(along, distance));
      }
      trail.current.instanceMatrix.setUsage(DynamicDrawUsage);
      trail.current.instanceMatrix.needsUpdate = true;
      alphas.needsUpdate = true;
    }
    initialized.current = true;

    halo.current.position.set(position[0], guidanceGroundY(position[1]), position[2]);
    // Continuous sine pulse has no expanding-ring reset/pop.
    const breath = reducedMotion.current ? 0 : Math.sin(clock.elapsedTime * 1.8);
    halo.current.scale.setScalar(1 + breath * 0.025);
    const haloStrength = haloMaterial.current?.uniforms["strength"];
    if (haloStrength) haloStrength.value = 0.82 + breath * 0.05;
  });

  if (!target || muted) return null;
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
            depthTest
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
        <group name="quest-direction" ref={arrow}>
          <instancedMesh
            name="quest-arrow-trail"
            ref={trail}
            args={[trailGeometry, undefined, GUIDANCE_TRAIL.count]}
            frustumCulled={false}
            renderOrder={20}
          >
            <shaderMaterial
              ref={trailMaterial}
              uniforms={trailUniforms}
              vertexShader={trailVertexShader}
              fragmentShader={trailFragmentShader}
              transparent
              depthTest
              depthWrite={false}
              toneMapped={false}
            />
          </instancedMesh>
        </group>
      </group>
      <group name="quest-objective-halo" ref={halo} visible={false}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} renderOrder={18}>
          <planeGeometry args={[2.6, 2.6]} />
          <shaderMaterial
            ref={haloMaterial}
            uniforms={haloUniforms}
            vertexShader={vertexShader}
            fragmentShader={fragmentShader}
            transparent
            depthTest
            depthWrite={false}
            toneMapped={false}
          />
        </mesh>
      </group>
    </group>
  );
}
