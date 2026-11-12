/** @jsxImportSource @/game/jsx */
import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { groundContacts } from "./contact-shadows";
import { avatarSurfaceY } from "../avatar/grounding";
import * as T from "three";
import { treeParts, type TreeSpot, type PlantPart } from "./vegetation";
import { reducedMotion } from "../vehicles/visual";
import { useRenderBudget } from "../engine/AdaptiveQuality";
import { NaturalTrees } from "./NaturalTrees";
const crown = new T.SphereGeometry(0.5, 12, 8);
const bark = new T.CylinderGeometry(0.32, 0.5, 1, 8);
function frond() {
  const positions: number[] = [],
    indices: number[] = [];
  for (let i = 0; i <= 12; i++) {
    const t = i / 12,
      w = Math.sin(Math.PI * t) * 0.22 * (i % 2 ? 0.72 : 1),
      y = Math.sin(Math.PI * t) * 0.48 - t * 0.29;
    positions.push(-w, y - 0.035, t, 0, y + 0.025, t, w, y - 0.035, t);
    if (i < 12) {
      const n = i * 3;
      indices.push(n, n + 3, n + 1, n + 1, n + 3, n + 4, n + 1, n + 4, n + 2, n + 2, n + 4, n + 5);
    }
  }
  const g = new T.BufferGeometry();
  g.setAttribute("position", new T.Float32BufferAttribute(positions, 3));
  g.setIndex(indices);
  g.computeVertexNormals();
  return g;
}
const shapes = { crown, bark, twig: bark, frond: frond() };
function Plants({ items, shape }: { items: PlantPart[]; shape: PlantPart["shape"] }) {
  const ref = useRef<T.InstancedMesh>(null);
  const material = useMemo(() => {
    const m = new T.MeshStandardMaterial({
      roughness: 0.92,
      side: shape === "frond" ? T.DoubleSide : T.FrontSide,
    });
    const time = { value: 0 },
      wind = { value: 0 };
    m.name = `CartoonFoliage-${shape}`;
    m.userData["wind"] = wind;
    m.onBeforeCompile = (shader) => {
      shader.uniforms["foliageTime"] = time;
      shader.uniforms["foliageWind"] = wind;
      shader.vertexShader =
        "uniform float foliageTime; uniform float foliageWind; varying float foliageHeight;\n" +
        shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
    foliageHeight = position.y + .5;
    float phase = instanceMatrix[3].x*.63 + instanceMatrix[3].z*.41;
    float sway = sin(foliageTime*1.25+phase)*foliageWind;
    transformed.x += sway * ${shape === "frond" ? "position.z*position.z" : "(position.y+.5)*.3"};
    transformed.z += cos(foliageTime*.8+phase)*foliageWind*.15;
   `,
      );
      // Sunlit tops and shaded undersides give each canopy lobe volume.
      if (shape === "crown")
        shader.fragmentShader = ("varying float foliageHeight;\n" + shader.fragmentShader).replace(
          "#include <color_fragment>",
          `#include <color_fragment>
      diffuseColor.rgb *= mix(vec3(.62,.7,.66), vec3(1.16,1.2,.92), smoothstep(.1,.95,foliageHeight));`,
        );
    };
    m.customProgramCacheKey = () => `foliage-${shape}`;
    return { m, time, wind };
  }, [shape]);
  useEffect(() => () => material.m.dispose(), [material]);
  useLayoutEffect(() => {
    const o = new T.Object3D(),
      color = new T.Color(),
      mesh = ref.current!;
    items.forEach((p, i) => {
      o.position.set(...p.p);
      o.scale.set(...p.s);
      o.rotation.set(p.rx ?? 0, p.ry ?? 0, p.rz ?? 0);
      o.updateMatrix();
      mesh.setMatrixAt(i, o.matrix);
      mesh.setColorAt(i, color.set(p.color));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [items]);
  useFrame(({ clock }) => {
    material.time.value = clock.elapsedTime;
    material.wind.value =
      shape === "bark" || reducedMotion() ? 0 : shape === "twig" ? 0.018 : 0.055;
  });
  return (
    <instancedMesh
      ref={ref}
      args={[shapes[shape], material.m, items.length]}
      castShadow
      receiveShadow
      dispose={null}
    />
  );
}
function PalmTrees({ spots }: { spots: TreeSpot[] }) {
  const id = useId();
  useEffect(() => {
    groundContacts.set(
      id,
      spots.map((p) => ({
        x: p.x,
        y: p.y ?? avatarSurfaceY(p),
        z: p.z,
        width: (p.palm ? 2.2 : 2.8) * (p.scale ?? 1),
        length: (p.palm ? 2.2 : 2.8) * (p.scale ?? 1),
        yaw: 0,
      })),
    );
    return () => {
      groundContacts.delete(id);
    };
  }, [id, spots]);
  const all = useMemo(() => spots.flatMap(treeParts), [spots]);
  const [items, setItems] = useState(all);
  const next = useRef(0),
    key = useRef("");
  useFrame(({ camera, clock }) => {
    if (clock.elapsedTime < next.current) return;
    next.current = clock.elapsedTime + 0.75;
    const range = useRenderBudget.getState().tier === "LOW" ? 30 : 50;
    const visible: PlantPart[] = [],
      indices: number[] = [];
    all.forEach((p, i) => {
      if (!p.detail || Math.hypot(p.p[0] - camera.position.x, p.p[2] - camera.position.z) < range) {
        visible.push(p);
        indices.push(i);
      }
    });
    const id = indices.join(",");
    if (id !== key.current) {
      key.current = id;
      setItems(visible);
    }
  });
  return (
    <group name="CartoonVegetation">
      {(["bark", "twig", "crown", "frond"] as const).map((shape) => {
        const batch = items.filter((p) => p.shape === shape);
        return batch.length ? <Plants key={shape} shape={shape} items={batch} /> : null;
      })}
    </group>
  );
}

/** Existing palm assets remain identical at both beaches; city shade trees use the forest model. */
export function Trees({ spots }: { spots: TreeSpot[] }) {
  const palms = useMemo(() => spots.filter((spot) => spot.palm), [spots]);
  const natural = useMemo(() => spots.filter((spot) => !spot.palm), [spots]);
  return (
    <group name="OutdoorTrees">
      {natural.length > 0 && <NaturalTrees spots={natural} />}
      {palms.length > 0 && <PalmTrees spots={palms} />}
    </group>
  );
}
