import * as T from "three";
import { useMobility } from "@/game/mobility/store";
import { bikeModel } from "@/game/vehicles/model";
import { disposeOutfit } from "@/game/mountain/outfit-meshes";

export interface RiderStyle {
  jacket?: { color: string; trim: string } | null;
  helmet?: { color: string; shape: "half" | "full" } | null;
}
/** Everyone on a motor wears a helmet; the Garasi one replaces this plain white. */
const DEFAULT_HELMET = { color: "#f1f1ec", shape: "half" } as const;

/** Gear key for a player seated on a bike, "" otherwise (a string keeps the selector stable). */
export function useRiderGear(id?: string) {
  return useMobility((s) => {
    const v = id ? s.vehicles?.find((v) => v.occupants.some((o) => o.connectionId === id)) : null;
    const seat = v?.occupants.find((o) => o.connectionId === id && o.status === "active");
    if (!v || !seat || !bikeModel(v.model)) return "";
    return JSON.stringify({
      helmet: seat.style?.helmet ?? DEFAULT_HELMET,
      jacket: seat.style?.jacket ?? null,
    });
  });
}

function part(g: T.Group, geo: T.BufferGeometry, color: string, p: number[], s = [1, 1, 1]) {
  const m = new T.Mesh(geo, new T.MeshStandardMaterial({ color, roughness: 0.55 }));
  m.position.fromArray(p);
  m.scale.fromArray(s);
  m.castShadow = true;
  g.add(m);
  return m;
}
function helmet({ color, shape }: NonNullable<RiderStyle["helmet"]>) {
  const g = new T.Group();
  const dome = new T.SphereGeometry(0.33, 20, 12, 0, Math.PI * 2, 0, Math.PI / 1.85);
  part(g, dome, color, [0, 0, -0.01], [1, 1, 1.08]);
  part(
    g,
    new T.TorusGeometry(0.315, 0.022, 6, 24),
    "#2a2f35",
    [0, -0.01, -0.01],
    [1, 1.08, 1],
  ).rotation.x = Math.PI / 2;
  if (shape === "full") {
    // Chin guard + dark visor wrap the face like a full-face helmet.
    const chin = part(g, new T.TorusGeometry(0.29, 0.06, 8, 18, Math.PI), color, [0, -0.17, 0.02]);
    chin.rotation.x = Math.PI / 2;
    chin.rotation.z = Math.PI;
    part(g, new T.SphereGeometry(0.3, 16, 8, -0.9, 1.8, 1.2, 0.6), "#1c2630", [0, 0, 0.03]);
  } else {
    part(g, new T.BoxGeometry(0.42, 0.03, 0.16), color, [0, 0.0, 0.33], [1, 1, 1]).rotation.x =
      0.18; // peak
    part(g, new T.BoxGeometry(0.02, 0.2, 0.02), "#2a2f35", [0.26, -0.18, 0.06]); // strap
    part(g, new T.BoxGeometry(0.02, 0.2, 0.02), "#2a2f35", [-0.26, -0.18, 0.06]);
  }
  return g;
}
function jacket({ color, trim }: NonNullable<RiderStyle["jacket"]>) {
  const g = new T.Group();
  part(g, new T.BoxGeometry(0.46, 0.46, 0.36), color, [0, 0.01, -0.02]);
  part(g, new T.BoxGeometry(0.47, 0.05, 0.37), trim, [0, -0.1, -0.02]); // reflective band
  part(g, new T.BoxGeometry(0.3, 0.08, 0.3), trim, [0, 0.24, -0.02]); // collar
  part(g, new T.BoxGeometry(0.3, 0.16, 0.01), trim, [0, 0.08, -0.205]); // back panel
  return g;
}

/** Helmet on the head + ojol jacket over the torso while riding; undone when the key changes. */
export function attachRiderGear(scene: T.Object3D, key: string, explorer = false) {
  if (!key) return;
  const style = JSON.parse(key) as RiderStyle;
  const head = scene.getObjectByName("Head"),
    torso = scene.getObjectByName(explorer ? "Body" : "Chest");
  if (!head || !torso) return;
  const scale = explorer ? 2.45 / 1.74 : 1;
  const added: T.Object3D[] = [];
  const hat = scene.getObjectByName("Socket_headwear"),
    hatWas = hat?.visible;
  if (style.helmet) {
    const h = helmet(style.helmet);
    h.scale.setScalar(scale);
    h.position.y = 0.2 * scale;
    head.add(h);
    added.push(h);
    if (hat) hat.visible = false;
  }
  if (style.jacket) {
    const j = jacket(style.jacket);
    j.scale.setScalar(scale);
    j.position.y = explorer ? 1.3 : -0.045;
    torso.add(j);
    added.push(j);
  }
  return () => {
    added.forEach(disposeOutfit);
    if (hat && hatWas !== undefined) hat.visible = hatWas;
  };
}
