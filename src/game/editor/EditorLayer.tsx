/** @jsxImportSource @/game/jsx */
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Html, OrbitControls, TransformControls } from "@react-three/drei";
import { Group, Mesh, Raycaster, Vector2 } from "three";
import { dynamicInteractables } from "@/game/interactions/dynamic";
import { INTERACTABLES } from "@/game/interactions/interactables";
import { useGame } from "@/state/game-store";
import { useWorldEditor, type WorldTarget } from "./store";
export const icons = {
  POI: "📍",
  WORLD_OBJECT: "📦",
  NPC: "👤",
  CLUE: "❓",
  TRIGGER: "⚡",
  TELEPORT: "🌀",
  SPAWN: "👣",
  DUNGEON: "🚪",
};
function Marker({ target: t }: { target: WorldTarget }) {
  const s = useWorldEditor(),
    ref = useRef<Group>(null);
  const selected = s.selected === t.id && s.mode === "EDITOR";
  const commit = () => {
    const g = ref.current;
    if (!g) return;
    s.update(t.id, {
      position: { x: g.position.x, y: g.position.y, z: g.position.z },
      rotation: { x: g.rotation.x, y: g.rotation.y, z: g.rotation.z },
      scale: { x: g.scale.x, y: g.scale.y, z: g.scale.z },
    });
  };
  if (!s.show[t.type]) return null;
  return (
    <>
      <group
        ref={ref}
        userData={{ editor: true }}
        position={[t.position.x, t.position.y, t.position.z]}
        rotation={[t.rotation.x, t.rotation.y, t.rotation.z]}
        scale={[t.scale.x, t.scale.y, t.scale.z]}
      >
        <mesh
          onClick={(e) => {
            e.stopPropagation();
            if (s.mode === "EDITOR") useWorldEditor.setState({ selected: t.id, tool: "select" });
          }}
        >
          <octahedronGeometry args={[0.25]} />
          <meshBasicMaterial color={selected ? "#ffdd55" : "#44ddee"} />
        </mesh>
        <Html position={[0, 0.7, 0]} center>
          <button
            style={{
              whiteSpace: "nowrap",
              background: "#142536e8",
              color: "white",
              padding: "4px 8px",
              borderRadius: 6,
              opacity: t.active ? 1 : 0.5,
            }}
            onClick={() => {
              if (s.mode === "EDITOR") useWorldEditor.setState({ selected: t.id, tool: "select" });
            }}
          >
            {icons[t.type]} {t.name}
            {s.show[t.type === "NPC" ? "npcIds" : "objectIds"] && (
              <small>
                <br />
                {t.entityId ?? t.id}
              </small>
            )}
            {s.show["coordinates"] && (
              <small>
                <br />
                {Object.values(t.position)
                  .map((n) => n.toFixed(2))
                  .join(", ")}
              </small>
            )}
          </button>
        </Html>
      </group>
      {/* Radius is in world metres, independent of decorative marker scale. */}
      {t.type === "TRIGGER" && (
        <mesh userData={{ editor: true }} position={[t.position.x, t.position.y, t.position.z]}>
          <cylinderGeometry args={[t.radius, t.radius, 3.6, 32]} />
          <meshBasicMaterial color="#55cfff" transparent opacity={0.16} depthWrite={false} />
        </mesh>
      )}
      {selected && (
        <TransformControls
          object={ref as React.RefObject<Group>}
          mode={s.transform}
          onMouseUp={commit}
        />
      )}
    </>
  );
}
function RuntimeIds() {
  const group = useRef<Group>(null),
    s = useWorldEditor();
  const entries = [...INTERACTABLES, ...dynamicInteractables()].filter(
    (t) => s.show[t.kind === "npc" ? "npcIds" : "objectIds"],
  );
  useFrame(() => {
    group.current?.children.forEach((child) => {
      const t = dynamicInteractables().find((t) => t.id === child.name);
      if (t) child.position.set(...t.position);
    });
  });
  return (
    <group ref={group} userData={{ editor: true }}>
      {entries.map((t) => (
        <group key={t.id} name={t.id} position={t.position}>
          <Html position={[0, 2, 0]} center>
            <span style={{ color: "#ffdf60", background: "#111c", whiteSpace: "nowrap" }}>
              {t.id}
            </span>
          </Html>
        </group>
      ))}
    </group>
  );
}
export function EditorLayer() {
  const s = useWorldEditor(),
    { gl, scene, camera } = useThree();
  const focus = useRef(useGame.getState().playerPos);
  useEffect(() => {
    if (s.mode !== "EDITOR") return;
    focus.current = [...useGame.getState().playerPos];
    const ray = new Raycaster(),
      pointer = new Vector2();
    let down: [number, number] | null = null;
    const start = (e: PointerEvent) => {
      if (e.button === 0) down = [e.clientX, e.clientY];
    };
    const end = (e: PointerEvent) => {
      if (
        !down ||
        Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5 ||
        useWorldEditor.getState().tool === "select"
      ) {
        down = null;
        return;
      }
      down = null;
      const rect = gl.domElement.getBoundingClientRect();
      pointer.set(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      );
      ray.setFromCamera(pointer, camera);
      const hit = ray.intersectObjects(scene.children, true).find((h) => {
        if (!(h.object instanceof Mesh)) return false;
        let node: typeof h.object | null = h.object;
        while (node) {
          if (!node.visible || node.userData["editor"] || node.type.includes("TransformControls"))
            return false;
          node = node.parent;
        }
        return true;
      });
      if (hit) {
        let object: typeof hit.object | null = hit.object;
        let entityId: string | undefined;
        while (object) {
          if (typeof object.userData["entityId"] === "string") {
            entityId = object.userData["entityId"];
            break;
          }
          object = object.parent;
        }
        useWorldEditor
          .getState()
          .place({ x: hit.point.x, y: hit.point.y, z: hit.point.z }, entityId);
      }
    };
    gl.domElement.addEventListener("pointerdown", start);
    gl.domElement.addEventListener("pointerup", end);
    return () => {
      gl.domElement.removeEventListener("pointerdown", start);
      gl.domElement.removeEventListener("pointerup", end);
    };
  }, [s.mode, gl, scene, camera]);
  if (!s.canEdit || s.mode === "PLAYER") return null;
  return (
    <>
      {s.mode === "EDITOR" && (
        <OrbitControls makeDefault target={focus.current} minDistance={1} maxDistance={150} />
      )}
      {s.targets
        .filter((t) => t.scene === "toko-cung-world")
        .map((t) => (
          <Marker key={t.id} target={t} />
        ))}
      <RuntimeIds />
    </>
  );
}
