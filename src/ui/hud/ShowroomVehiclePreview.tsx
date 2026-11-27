/** @jsxImportSource @/game/jsx */
import {
  Component,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
  type PointerEvent,
  type ReactNode,
} from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { CarFront, Move, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Box3, Vector3, type Group } from "three";
import { StyledBatch } from "@/game/assets/StyledBatch";
import { vehicleParts, type VehicleKind } from "@/game/assets/vehicles";
import { VEHICLE_DEFINITIONS } from "@/game/vehicles/definitions";
import { isMotorcycle } from "@/game/vehicles/motorcycles";
import { GameIconButton } from "@/ui/game-ui/GamePanel";
import { GarageVehicleStage } from "./GarageVehicleStage";

type View = { yaw: number; pitch: number; zoom: number };
type Point = { x: number; y: number };
type PreviewVariant = "studio" | "garage";
const initialView: View = { yaw: 0, pitch: 0, zoom: 1 };
const minZoom = 0.72;
const maxZoom = 2.35;
const zoomStep = 1.24;
const fieldOfView = 25;
const clampZoom = (zoom: number) => Math.min(maxZoom, Math.max(minZoom, zoom));
const orbit = (view: View, yaw: number, pitch: number, variant: PreviewVariant): View => ({
  ...view,
  yaw: (view.yaw + yaw) % (2 * Math.PI),
  pitch:
    variant === "garage"
      ? Math.min(0.44, Math.max(-0.17, view.pitch + pitch))
      : Math.min(1.03, Math.max(-1.22, view.pitch + pitch)),
});

class PreviewBoundary extends Component<
  { children: ReactNode; onError: () => void },
  { unavailable: boolean }
> {
  override state = { unavailable: false };

  static getDerivedStateFromError() {
    return { unavailable: true };
  }

  override componentDidCatch() {
    this.props.onError();
  }

  override render() {
    return this.state.unavailable ? null : this.props.children;
  }
}

function VehicleScene({
  model,
  color,
  view,
  variant,
  onReady,
  onError,
}: {
  model: VehicleKind | null;
  color: string;
  view: View;
  variant: PreviewVariant;
  onReady: () => void;
  onError: () => void;
}) {
  const parts = useMemo(() => (model ? vehicleParts(model, color) : []), [model, color]);
  const sizeInMeters = model ? VEHICLE_DEFINITIONS[model].size : null;
  const { camera, gl, invalidate, size } = useThree();
  const vehicle = useRef<Group>(null);
  const corners = useRef<Vector3[]>([]);
  const rendered = useRef(false);

  useLayoutEffect(() => {
    if (!vehicle.current) {
      corners.current = [];
      return;
    }
    const { min, max } = new Box3().setFromObject(vehicle.current);
    corners.current = [min.x, max.x].flatMap((x) =>
      [min.y, max.y].flatMap((y) => [min.z, max.z].map((z) => new Vector3(x, y, z))),
    );
  }, [model]);

  useLayoutEffect(() => {
    // Start at the three-quarter angle used by the catalog thumbnails.
    const bike = model !== null && isMotorcycle(model);
    const [x, y, z] = bike ? [3.6, 1.35, 3.6] : [5.55, 2.59, 6.45];
    const targetY =
      variant === "garage" && sizeInMeters ? sizeInMeters[1] * 0.44 : bike ? 0.7 : 0.66;
    const yaw = Math.atan2(x, z) + view.yaw;
    const pitch = Math.atan2(y, Math.hypot(x, z)) + view.pitch;
    const towardCamera = new Vector3(
      Math.sin(yaw) * Math.cos(pitch),
      Math.sin(pitch),
      Math.cos(yaw) * Math.cos(pitch),
    );
    const right = new Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
    const up = new Vector3().crossVectors(towardCamera, right);
    const verticalLimit = 0.9 * Math.tan((fieldOfView * Math.PI) / 360);
    const horizontalLimit = (verticalLimit * size.width) / size.height;
    let distance = Math.hypot(x, y, z);
    // Keep the entire model visible at 1×, even as one end of it swings toward the camera.
    for (const corner of corners.current) {
      const depth = corner.dot(towardCamera) - targetY * towardCamera.y;
      const vertical = corner.dot(up) - targetY * up.y;
      distance = Math.max(
        distance,
        depth + Math.abs(vertical) / verticalLimit,
        depth + Math.abs(corner.dot(right)) / horizontalLimit,
      );
    }
    camera.position.copy(towardCamera.multiplyScalar(distance / view.zoom));
    camera.position.y += targetY;
    camera.lookAt(0, targetY, 0);
    invalidate();
  }, [camera, invalidate, model, size.height, size.width, sizeInMeters, variant, view]);

  useFrame(() => {
    if (rendered.current) return;
    rendered.current = true;
    onReady();
  });

  useEffect(() => {
    const canvas = gl.domElement;
    canvas.addEventListener("webglcontextlost", onError);
    return () => canvas.removeEventListener("webglcontextlost", onError);
  }, [gl, onError]);

  return (
    <>
      <hemisphereLight args={["#eaf4ff", "#918ea0", 2.4]} />
      <directionalLight position={[4, 7, 5]} color="#fff6e8" intensity={2.45} />
      <directionalLight position={[-4, 4, -5]} color="#bdd7ff" intensity={1.45} />
      {variant === "garage" && (
        <GarageVehicleStage
          orbitYaw={view.yaw}
          footprint={sizeInMeters && [sizeInMeters[0], sizeInMeters[2]]}
        />
      )}
      {model && (
        <group key={model} ref={vehicle}>
          <StyledBatch items={parts} />
        </group>
      )}
    </>
  );
}

export function ShowroomVehiclePreview({
  model,
  name,
  color,
  image,
  variant = "studio",
}: {
  model: VehicleKind | null;
  name: string;
  color: string;
  image: string | undefined;
  variant?: PreviewVariant;
}) {
  const [preview, setPreview] = useState({ model, view: initialView });
  const [ready, setReady] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const stage = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, Point>());
  const instructions = useId();

  if (preview.model !== model) setPreview({ model, view: initialView });

  const updateView = useCallback((adjust: (view: View) => View) => {
    setPreview((current) => ({ ...current, view: adjust(current.view) }));
  }, []);
  const zoomBy = useCallback(
    (factor: number) => updateView((view) => ({ ...view, zoom: clampZoom(view.zoom * factor) })),
    [updateView],
  );
  const onReady = useCallback(() => setReady(true), []);
  const onError = useCallback(() => setUnavailable(true), []);
  const interactive = model !== null && ready && !unavailable;

  useEffect(() => {
    if (!interactive || !stage.current) return;
    const element = stage.current;
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      event.stopPropagation();
      const delta = event.deltaY * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? 100 : 1);
      zoomBy(Math.exp(-delta * 0.002));
    };
    element.addEventListener("wheel", wheel, { passive: false });
    return () => element.removeEventListener("wheel", wheel);
  }, [interactive, zoomBy]);

  function startPointer(event: PointerEvent<HTMLDivElement>) {
    if (event.button !== 0 || pointers.current.size === 2) return;
    event.stopPropagation();
    const element = event.currentTarget;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    element.setPointerCapture(event.pointerId);
    element.dataset["dragging"] = "true";
  }

  function movePointer(event: PointerEvent<HTMLDivElement>) {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;
    event.stopPropagation();
    const next = { x: event.clientX, y: event.clientY };
    pointers.current.set(event.pointerId, next);
    if (pointers.current.size === 2) {
      const other = [...pointers.current].find(([id]) => id !== event.pointerId)?.[1];
      if (!other) return;
      const previousDistance = Math.hypot(previous.x - other.x, previous.y - other.y);
      const nextDistance = Math.hypot(next.x - other.x, next.y - other.y);
      if (previousDistance > 0 && nextDistance > 0) zoomBy(nextDistance / previousDistance);
      return;
    }
    updateView((view) =>
      orbit(view, (previous.x - next.x) * 0.012, (next.y - previous.y) * 0.009, variant),
    );
  }

  function endPointer(event: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(event.pointerId)) return;
    event.stopPropagation();
    if (!pointers.current.size) delete event.currentTarget.dataset["dragging"];
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    switch (event.key) {
      case "ArrowLeft":
        updateView((view) => orbit(view, 0.25, 0, variant));
        break;
      case "ArrowRight":
        updateView((view) => orbit(view, -0.25, 0, variant));
        break;
      case "ArrowUp":
        updateView((view) => orbit(view, 0, 0.18, variant));
        break;
      case "ArrowDown":
        updateView((view) => orbit(view, 0, -0.18, variant));
        break;
      case "+":
      case "=":
        zoomBy(zoomStep);
        break;
      case "-":
        zoomBy(1 / zoomStep);
        break;
      case "Home":
        updateView(() => initialView);
        break;
      default:
        return;
    }
    event.preventDefault();
    event.stopPropagation();
  }

  return (
    <div className="showroom-shop-stage" data-preview-variant={variant}>
      {model &&
        !interactive &&
        (image ? (
          <img src={image} alt={name} width={640} height={360} />
        ) : (
          <CarFront className="showroom-shop-car-fallback" aria-hidden />
        ))}
      {!unavailable && (
        <div className="showroom-shop-canvas" aria-hidden="true">
          <PreviewBoundary onError={onError}>
            <Canvas
              frameloop="demand"
              dpr={[1, 1.5]}
              camera={{ fov: fieldOfView, near: 0.1, far: 40 }}
              gl={{ alpha: true, antialias: true, powerPreference: "low-power" }}
            >
              <VehicleScene
                model={model}
                color={color}
                view={preview.view}
                variant={variant}
                onReady={onReady}
                onError={onError}
              />
            </Canvas>
          </PreviewBoundary>
        </div>
      )}
      {interactive && (
        <>
          <div
            ref={stage}
            className="showroom-shop-orbit"
            data-showroom-preview
            role="group"
            tabIndex={0}
            aria-label={`Pratinjau 3D ${name}`}
            aria-describedby={instructions}
            onPointerDown={startPointer}
            onPointerMove={movePointer}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
            onLostPointerCapture={endPointer}
            onKeyDown={onKeyDown}
          >
            <span className="showroom-shop-orbit-hint" aria-hidden="true">
              <Move size={14} /> Geser untuk memutar
            </span>
          </div>
          <span id={instructions} className="sr-only">
            Geser atau gunakan tombol panah untuk memutar. Cubit, gulir, atau tekan plus dan minus
            untuk zoom. Tekan Home untuk mengatur ulang tampilan.
          </span>
          <div className="showroom-shop-orbit-tools" role="group" aria-label="Kontrol tampilan">
            <GameIconButton
              label="Perkecil"
              onClick={() => zoomBy(1 / zoomStep)}
              disabled={preview.view.zoom === minZoom}
            >
              <ZoomOut aria-hidden />
            </GameIconButton>
            <GameIconButton
              label="Perbesar"
              onClick={() => zoomBy(zoomStep)}
              disabled={preview.view.zoom === maxZoom}
            >
              <ZoomIn aria-hidden />
            </GameIconButton>
            <GameIconButton
              label="Atur ulang tampilan"
              onClick={() => updateView(() => initialView)}
            >
              <RotateCcw aria-hidden />
            </GameIconButton>
          </div>
        </>
      )}
    </div>
  );
}
