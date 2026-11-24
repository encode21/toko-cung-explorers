/** @jsxImportSource @/game/jsx */
import { Plang } from "@/game/world/Plang";
import {
  Suspense,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Canvas, useThree, type ThreeEvent } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import {
  extraInstanceParts,
  type DecorPlacement,
  type WarungDecorItem,
  type WarungStyle,
} from "./decor";
import {
  constrainDecorPlacement,
  decorPlacementBox,
  getDecorInstances,
  getDecorRule,
  type DecorInstance,
} from "./decor-placement";
import { roomParts } from "./room-parts";

export interface WarungDecorPreviewProps {
  level: number;
  style: WarungStyle;
  slot: WarungDecorItem["slot"];
  selectedId: string | null;
  selectedInstanceId: string | null;
  onSelectInstance: (id: string) => void;
  onPlacementChange: (instanceId: string, placement: DecorPlacement) => Promise<boolean>;
  disabled: boolean;
  canPlace: boolean;
  placementToolsOpen?: boolean;
}
interface DragSession {
  id: string;
  pointerId: number;
  origin: DecorPlacement;
  current: DecorPlacement;
  plane: THREE.Plane;
  offset: THREE.Vector3;
  moved: boolean;
  captureTarget: HTMLElement;
}
function CameraFrame({
  slot,
  placementToolsOpen,
}: {
  slot: WarungDecorItem["slot"];
  placementToolsOpen: boolean;
}) {
  const { camera, size, invalidate } = useThree();
  useLayoutEffect(() => {
    if (!(camera instanceof THREE.PerspectiveCamera)) return;
    const compact = window.matchMedia("(max-width: 900px), (max-height: 550px)").matches;
    const reserveTop = compact ? 80 : 90;
    const reserveRight = compact ? 56 : 64;
    const reserveBottom = placementToolsOpen && slot === "extra" ? 150 : compact ? 70 : 80;
    const left = 12,
      top = reserveTop + 12;
    const width = Math.max(80, size.width - reserveRight - 24);
    const height = Math.max(80, size.height - reserveTop - reserveBottom - 24);
    const target = new THREE.Vector3(0, slot === "floor" ? 0.7 : 1.1, 0.45);
    const direction = new THREE.Vector3(
      ...((slot === "floor"
        ? [0.75, 1.55, 1.3]
        : slot === "extra"
          ? [0.8, 1.1, 1.45]
          : [0.9, 0.8, 1.5]) as [number, number, number]),
    ).normalize();
    const right = new THREE.Vector3()
      .crossVectors(new THREE.Vector3(0, 1, 0), direction)
      .normalize();
    const up = new THREE.Vector3().crossVectors(direction, right);
    const focal = size.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)));
    // Include the complete plinth, all walls and the projecting awning in the fit.
    const corners = [-7.5, 7.5].flatMap((x) =>
      [-0.5, 3.6].flatMap((y) => [-6.25, 7.05].map((z) => new THREE.Vector3(x, y, z))),
    );
    const distance =
      Math.max(
        ...corners.map((corner) => {
          const point = corner.clone().sub(target);
          return (
            point.dot(direction) +
            Math.max(
              (Math.abs(point.dot(right)) * focal) / (width / 2),
              (Math.abs(point.dot(up)) * focal) / (height / 2),
            )
          );
        }),
      ) * 1.04;
    camera.clearViewOffset();
    camera.position.copy(target).addScaledVector(direction, distance);
    camera.lookAt(target);
    camera.updateMatrixWorld();
    camera.updateProjectionMatrix();
    const projected = corners.map((corner) => corner.clone().project(camera));
    const centerX =
      ((Math.min(...projected.map((p) => p.x)) + Math.max(...projected.map((p) => p.x))) *
        size.width) /
        4 +
      size.width / 2;
    const centerY =
      size.height / 2 -
      ((Math.min(...projected.map((p) => p.y)) + Math.max(...projected.map((p) => p.y))) *
        size.height) /
        4;
    camera.setViewOffset(
      size.width,
      size.height,
      centerX - (left + width / 2),
      centerY - (top + height / 2),
      size.width,
      size.height,
    );
    invalidate();
  }, [camera, invalidate, size.width, size.height, slot, placementToolsOpen]);
  return null;
}
function SelectionOutline({ instance, rejected }: { instance: DecorInstance; rejected: boolean }) {
  const b = decorPlacementBox(instance.decorId, instance.placement);
  return (
    <mesh
      position={[(b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2, (b.minZ + b.maxZ) / 2]}
      raycast={() => null}
    >
      <boxGeometry
        args={[b.maxX - b.minX + 0.08, b.maxY - b.minY + 0.08, b.maxZ - b.minZ + 0.08]}
      />
      <meshBasicMaterial
        color={rejected ? "#e75640" : "#f6a017"}
        wireframe
        transparent
        opacity={0.8}
        depthTest={false}
      />
    </mesh>
  );
}
function DecorObject({
  instance,
  selected,
  rejected,
  onDown,
  onMove,
  onUp,
}: {
  instance: DecorInstance;
  selected: boolean;
  rejected: boolean;
  onDown: (event: ThreeEvent<PointerEvent>, instance: DecorInstance) => void;
  onMove: (event: ThreeEvent<PointerEvent>) => void;
  onUp: (event: ThreeEvent<PointerEvent>) => void;
}) {
  const items = useMemo(
    () => extraInstanceParts(instance.id, instance.placement),
    [instance.id, instance.placement],
  );
  const p = instance.placement;
  return (
    <group
      name={`Decor-${instance.id}`}
      onPointerDown={(e) => onDown(e, instance)}
      onPointerMove={onMove}
      onPointerUp={onUp}
    >
      <StyledBatch items={items} />
      {instance.decorId === "neon-buka" && (
        <group position={[p.x, p.y, p.z]} rotation={[0, p.rotation, 0]}>
          <Plang
            text="BUKA"
            position={[0, 0, 0]}
            size={0.5}
            board="#1a1220"
            textColor="#ff4fa3"
            neon
          />
        </group>
      )}
      {selected && <SelectionOutline instance={instance} rejected={rejected} />}
    </group>
  );
}
function PreviewScene(props: WarungDecorPreviewProps) {
  const {
    level,
    style,
    slot,
    selectedId,
    selectedInstanceId,
    onSelectInstance,
    onPlacementChange,
    disabled,
    canPlace,
    placementToolsOpen = false,
  } = props;
  const canvas = useThree((state) => state.gl.domElement);
  const [draft, setDraft] = useState<{ id: string; placement: DecorPlacement } | null>(null);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rejected, setRejected] = useState(false);
  const drag = useRef<DragSession | null>(null);
  const request = useRef(0);
  const latestStyle = useRef(style);
  latestStyle.current = style;
  const latestEnabled = useRef(!disabled && canPlace);
  latestEnabled.current = !disabled && canPlace;
  const renderedStyle = useMemo(
    () =>
      draft
        ? { ...style, placements: { ...style.placements, [draft.id]: draft.placement } }
        : style,
    [draft, style],
  );
  const room = useMemo(
    () =>
      roomParts(level, style, {
        surroundings: false,
        extras: false,
        furnishings: slot !== "floor",
        fixtures: slot !== "floor",
      }),
    [level, style, slot],
  );
  const instances = useMemo(
    () => (slot === "floor" ? [] : getDecorInstances(renderedStyle)),
    [renderedStyle, slot],
  );
  useEffect(() => {
    request.current += 1;
    const active = drag.current;
    drag.current = null;
    if (active) active.captureTarget.releasePointerCapture(active.pointerId);
    setRejected(false);
    setDraft(null);
    setDragging(false);
    setSaving(false);
  }, [slot, selectedId]);
  useEffect(
    () => () => {
      request.current += 1;
      const active = drag.current;
      drag.current = null;
      if (active) active.captureTarget.releasePointerCapture(active.pointerId);
    },
    [],
  );
  const cancel = useCallback(() => {
    if (!drag.current) return;
    const active = drag.current;
    drag.current = null;
    active.captureTarget.releasePointerCapture(active.pointerId);
    setRejected(false);
    setDraft(null);
    setDragging(false);
  }, []);
  useEffect(() => {
    const pendingFrames = new Set<number>();
    const pointerCancel = (event: PointerEvent) => {
      if (drag.current?.pointerId === event.pointerId) cancel();
    };
    const lostCapture = (event: PointerEvent) => {
      const active = drag.current;
      if (!active || active.pointerId !== event.pointerId) return;
      // Fiber does not dispatch cancellation to object handlers. Native lost
      // capture can precede pointerup, so let a completed drag commit first.
      const frame = requestAnimationFrame(() => {
        pendingFrames.delete(frame);
        if (drag.current === active) cancel();
      });
      pendingFrames.add(frame);
    };
    canvas.addEventListener("pointercancel", pointerCancel);
    canvas.addEventListener("lostpointercapture", lostCapture);
    return () => {
      canvas.removeEventListener("pointercancel", pointerCancel);
      canvas.removeEventListener("lostpointercapture", lostCapture);
      pendingFrames.forEach(cancelAnimationFrame);
    };
  }, [canvas, cancel]);
  const down = (event: ThreeEvent<PointerEvent>, instance: DecorInstance) => {
    if (slot !== "extra" || drag.current || !event.isPrimary) return;
    event.stopPropagation();
    onSelectInstance(instance.id);
    if (disabled || !canPlace || saving || instance.decorId !== selectedId || event.button !== 0)
      return;
    const p = instance.placement;
    const normal =
      p.surface === "left-wall" || p.surface === "right-wall"
        ? new THREE.Vector3(1, 0, 0)
        : p.surface === "back-wall"
          ? new THREE.Vector3(0, 0, 1)
          : new THREE.Vector3(0, 1, 0);
    const plane = new THREE.Plane().setFromNormalAndCoplanarPoint(
      normal,
      new THREE.Vector3(p.x, p.y, p.z),
    );
    const point = event.ray.intersectPlane(plane, new THREE.Vector3());
    if (!point) return;
    drag.current = {
      id: instance.id,
      pointerId: event.pointerId,
      origin: p,
      current: p,
      plane,
      offset: point.sub(new THREE.Vector3(p.x, p.y, p.z)),
      moved: false,
      captureTarget: event.target as HTMLElement,
    };
    event.nativeEvent.stopImmediatePropagation();
    (event.target as HTMLElement).setPointerCapture(event.pointerId);
    setDragging(true);
  };
  const move = (event: ThreeEvent<PointerEvent>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.stopPropagation();
    if (!latestEnabled.current) {
      cancel();
      return;
    }
    const point = event.ray.intersectPlane(active.plane, new THREE.Vector3());
    if (!point) return;
    point.sub(active.offset);
    let proposal = { ...active.origin, x: point.x, y: point.y, z: point.z };
    // Side walls and the back wall form one drag surface. A pointer over another
    // wall reattaches the object there, while empty/outside space keeps the last valid draft.
    const rule = getDecorRule(active.id.split(":")[0]!);
    if (rule?.surface === "wall") {
      const hits = rule.surfaces
        .flatMap((surface) => {
          const normal =
            surface === "back-wall" ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(1, 0, 0);
          const anchor =
            surface === "back-wall"
              ? new THREE.Vector3(0, 0, -4.76)
              : new THREE.Vector3(surface === "left-wall" ? -5.76 : 5.76, 0, 0);
          const hit = event.ray.intersectPlane(
            new THREE.Plane().setFromNormalAndCoplanarPoint(normal, anchor),
            new THREE.Vector3(),
          );
          if (
            !hit ||
            hit.y < 0.2 ||
            hit.y > 3.5 ||
            Math.abs(hit.x) > 5.81 ||
            hit.z < -4.81 ||
            hit.z > 4.8
          )
            return [];
          return [{ point: hit, surface, distance: event.ray.origin.distanceToSquared(hit) }];
        })
        .sort((a, b) => a.distance - b.distance);
      const hit = hits[0];
      if (hit)
        proposal = {
          ...proposal,
          surface: hit.surface,
          x: hit.point.x,
          y: hit.point.y - active.offset.y,
          z: hit.point.z,
        };
    }
    const next = constrainDecorPlacement(active.id, proposal, latestStyle.current);
    setRejected(!next);
    if (!next) return;
    active.current = next;
    active.moved = true;
    setDraft({ id: active.id, placement: next });
  };
  const up = (event: ThreeEvent<PointerEvent>) => {
    const active = drag.current;
    if (!active || active.pointerId !== event.pointerId) return;
    event.stopPropagation();
    drag.current = null;
    setRejected(false);
    setDragging(false);
    active.captureTarget.releasePointerCapture(event.pointerId);
    if (!active.moved || !latestEnabled.current) {
      setDraft(null);
      return;
    }
    const token = ++request.current;
    setSaving(true);
    void onPlacementChange(active.id, active.current)
      .catch(() => false)
      .finally(() => {
        if (request.current !== token) return;
        setDraft(null);
        setSaving(false);
      });
  };
  return (
    <>
      <color attach="background" args={["#dff1f3"]} />
      <hemisphereLight args={["#fff9e9", "#a8bdad", 2.4]} />
      <directionalLight position={[-6, 12, 10]} intensity={2.6} />
      <directionalLight position={[8, 5, -6]} intensity={0.8} />
      <mesh position={[0, -0.43, 0.4]} receiveShadow>
        <boxGeometry args={[15, 0.12, 13.3]} />
        <meshStandardMaterial color="#b7d59b" roughness={1} />
      </mesh>
      <group name={slot === "floor" ? "WarungEmptyFloorShell" : "WarungPreviewRoom"}>
        <StyledBatch items={room} />
      </group>
      {instances.map((instance) => (
        <DecorObject
          key={instance.id}
          instance={instance}
          selected={slot === "extra" && instance.id === selectedInstanceId}
          rejected={rejected}
          onDown={down}
          onMove={move}
          onUp={up}
        />
      ))}
      <CameraFrame slot={slot} placementToolsOpen={placementToolsOpen} />
      <OrbitControls
        key={slot}
        target={[0, slot === "floor" ? 0.7 : 1.1, 0.45]}
        enabled={!dragging && !saving}
        enablePan={false}
        minDistance={10}
        maxDistance={160}
        minPolarAngle={0.3}
        maxPolarAngle={Math.PI * 0.46}
      />
    </>
  );
}
/** A dedicated, bounded shop model: category changes reframe it without moving the game camera. */
export function WarungDecorPreview(props: WarungDecorPreviewProps) {
  return (
    <div
      className="warung-decor-preview"
      data-decor-preview
      data-view={
        props.slot === "floor" ? "interior-empty" : props.slot === "extra" ? "interior" : "exterior"
      }
      style={{ width: "100%", height: "100%", minHeight: 180, touchAction: "none" }}
      aria-label={
        props.slot === "floor"
          ? "Pratinjau lantai warung kosong"
          : props.slot === "extra"
            ? "Pratinjau warung. Pilih dekorasi lalu geser untuk mengatur posisi."
            : "Pratinjau bangunan warung"
      }
    >
      <Canvas
        dpr={[1, 1.5]}
        frameloop="demand"
        camera={{ position: [13, 12, 20], fov: 42, near: 0.1, far: 400 }}
        gl={{ antialias: true, alpha: false }}
      >
        <Suspense fallback={null}>
          <PreviewScene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default WarungDecorPreview;
