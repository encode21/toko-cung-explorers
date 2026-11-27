import { WarungKasBalance } from "@/ui/hud/WarungKasBalance";
import { Suspense, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useThree } from "@react-three/fiber";
import { Environment, Lightformer } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { WarungScene } from "@/game/warung/WarungScene";
import { WarungHud } from "@/ui/hud/WarungHud";
import { WarungCommunityPanel } from "@/ui/hud/WarungCommunityPanel";
import { WarungDecorPanel } from "@/ui/hud/WarungDecorPanel";
import { WarungPanel } from "@/ui/hud/WarungPanel";
import { PhonePanel } from "@/ui/hud/PhonePanel";
import { TokoCungApp } from "@/ui/hud/TokoCungApp";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { StoreInterior } from "@/game/world/StoreInterior";
import { Shelf } from "@/game/world/Shelf";
import { SHELVES, STORE } from "@/game/world/layout";
import { GameViewport } from "@/ui/game-ui/GameViewport";
import { ActionProjection } from "@/game/interactions/ActionProjection";
import { SceneEnvironment } from "@/game/time/SceneEnvironment";
import { useSceneTime } from "@/game/time/scene-time";
import { describeTime } from "@/game/time/model";
import { useWarung } from "@/game/warung/store";
import { warungOrigin } from "@/game/warung/model";
import { WARUNG_COUNTER_CAMERA, WARUNG_COUNTER_TARGET } from "@/game/warung/counter-view";
import { useChannels, connectionId } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { createQueue, OWNER_ID, requestedItems, VISITOR_ID } from "./data";
import { resetTransport } from "./client";
import "@/styles.css";
import "./preview.css";

const query = new URLSearchParams(location.search);
// Test-only aid for native visual review. Default routes keep the real 12-second timer.
if (query.get("pace") === "slow") {
  const originalInterval = window.setInterval.bind(window);
  window.setInterval = (handler: TimerHandler, timeout?: number, ...args: unknown[]) =>
    originalInterval(handler, timeout === 1000 ? 10_000 : timeout, ...args);
  document.title = "[SLOW FIXTURE] Warung preview";
  document.documentElement.dataset["fixturePace"] = "slow";
}
const scenario = query.get("state") ?? "waiting";
const managementPreview = scenario === "management" || scenario === "manage";
const communityPreview = scenario.startsWith("community");
const decorPreview = scenario.startsWith("decor");
const deliveryPreview = scenario.startsWith("delivery");
const storePreview = scenario === "store";
const tokoAppPreview = scenario === "tokocung" || scenario === "tokocung-retry";
const visiting = scenario === "visitor" || scenario === "worker";
const roomId = visiting ? VISITOR_ID : OWNER_ID;
const origin = warungOrigin(roomId);
const offset = (tuple: readonly number[]): [number, number, number] => [
  origin[0] + tuple[0]!,
  origin[1] + tuple[1]!,
  origin[2] + tuple[2]!,
];
useSceneTime.setState({ ...describeTime(720), mode: "FIXED_TIME" });
useChannels.setState({
  lease: {
    channel: "CHANNEL-PREVIEW",
    connectionId,
    playerId: "preview-owner",
    expiresAt: "2099-01-01T00:00:00Z",
    realtimeToken: "test-only",
  },
  playing: true,
  sceneReady: true,
});
useGame.setState({
  overlay: "none",
  inside: storePreview,
  playerPos: storePreview ? [0, 0.83, -6] : offset([0, 0.83, -2.6]),
  pendingTeleport: null,
});

function seed() {
  if (storePreview) {
    useWarung.setState({
      inside: null,
      serviceView: false,
      order: null,
      customers: [],
      customer: null,
    });
    useGame.setState({
      inside: true,
      playerPos: [0, 0.83, -6],
      toast: null,
      pendingTeleport: null,
    });
    return;
  }
  const { snapshot, visit } = resetTransport(scenario);
  const customers =
    [
      "empty",
      "closed",
      "sealed",
      "visitor",
      "worker",
      "management",
      "manage",
      "tokocung",
      "tokocung-retry",
    ].includes(scenario) ||
    communityPreview ||
    decorPreview ||
    deliveryPreview
      ? []
      : createQueue(Date.now(), snapshot.event);
  useHud.setState({
    sheet: decorPreview
      ? "warung-decor"
      : communityPreview
        ? "warung-community"
        : tokoAppPreview
          ? "tokocung"
          : managementPreview
            ? "warung"
            : null,
  });
  useGame.setState({ toast: null, pendingTeleport: null });
  useWarung.setState({
    data: snapshot,
    inside: visiting ? visit : { ...snapshot.warung!, ownerName: "Kamu" },
    returnTo: [0, 0.83, 12],
    customers,
    customer: customers[0] ?? null,
    order: scenario === "serve" ? structuredClone(requestedItems) : null,
    nextCustomerAt: Date.now() + (scenario === "empty" ? 2500 : 600_000),
    serviceView: !visiting,
    locked: false,
    busy: false,
    error: "",
    serveStreak: 0,
    lastServeFeedback: null,
    recommendedRestock: null,
    basket: [],
    payChoice: false,
    shelfFilter: null,
    panelTab: communityPreview
      ? (query.get("tab") ?? "mampir")
      : managementPreview
        ? (query.get("tab") ?? "home")
        : null,
    directory: null,
    leaderboard: null,
  });
}

/** Only the requested sheet is mounted, keeping this fixture isolated from account screens. */
function PreviewManagementSheet() {
  const sheet = useHud((state) => state.sheet);
  if (sheet === "warung-decor") return <WarungDecorPanel />;
  if (sheet === "warung-community") return <WarungCommunityPanel />;
  if (sheet === "tokocung" || sheet === "phone")
    return (
      <GameModal
        key={sheet}
        title={sheet === "phone" ? "Handphone" : "Toko Cung App"}
        className="game-phone-sheet"
        bodyClassName="game-scroll-flush"
        onClose={() => useHud.getState().setSheet(null)}
      >
        {sheet === "phone" ? <PhonePanel /> : <TokoCungApp />}
      </GameModal>
    );
  if (sheet !== "warung") return null;
  return (
    <GameModal
      title="Warungku"
      className="game-warung-sheet warung-management-sheet"
      headerAccessory={<WarungKasBalance />}
      bodyClassName="game-scroll-flush"
      onClose={() => useHud.getState().setSheet(null)}
    >
      <WarungPanel />
    </GameModal>
  );
}

export function PreviewCamera() {
  const camera = useThree((state) => state.camera);
  const serviceView = useWarung((state) => state.serviceView);
  const insideId = useWarung((state) => state.inside?.id);
  useEffect(() => {
    if (storePreview) {
      const instant = query.get("view") === "instant";
      camera.position.set(
        ...((instant ? [-2, 2.2, 0.8] : [2.4, 2.3, -5.2]) as [number, number, number]),
      );
      camera.lookAt(
        ...((instant ? [-5.5, 0.9, -2.5] : [-1.6, 0.9, -9.2]) as [number, number, number]),
      );
      camera.updateMatrixWorld();
      return;
    }
    const currentOrigin = warungOrigin(insideId ?? roomId);
    const currentOffset = (point: readonly number[]): [number, number, number] => [
      currentOrigin[0] + point[0]!,
      currentOrigin[1] + point[1]!,
      currentOrigin[2] + point[2]!,
    ];
    camera.position.set(...currentOffset(serviceView ? WARUNG_COUNTER_CAMERA : [0, 1.78, 4.62]));
    camera.lookAt(...currentOffset(serviceView ? WARUNG_COUNTER_TARGET : [0, 1.38, 3]));
    camera.updateMatrixWorld();
  }, [camera, serviceView, insideId]);
  return null;
}

export function Preview() {
  const inside = useWarung((state) => state.inside);
  useEffect(() => {
    // WarungHud resets its room on mount. Seed only after that effect has completed.
    const timer = setTimeout(seed, 100);
    const reset = (event: KeyboardEvent) => {
      if (event.altKey && event.shiftKey && event.code === "KeyR") {
        event.preventDefault();
        seed();
      }
    };
    window.addEventListener("keydown", reset);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", reset);
    };
  }, []);
  return (
    <GameViewport allowPortrait>
      <div className="game-ui warung-preview" data-game-ui-root>
        <Canvas
          shadows
          camera={{
            position: offset(WARUNG_COUNTER_CAMERA),
            fov: 58,
            near: 0.1,
            far: 160,
          }}
        >
          <color attach="background" args={["#b3d9ed"]} />
          <SceneEnvironment />
          <Environment>
            <Lightformer
              intensity={1.6}
              position={[0, 12, 0]}
              scale={[24, 24, 1]}
              color="#ffffff"
            />
            <Lightformer
              intensity={0.9}
              color="#bcdcf5"
              position={[-14, 4, -6]}
              rotation-y={Math.PI / 2}
              scale={[30, 6, 1]}
            />
          </Environment>
          <PreviewCamera />
          <ActionProjection />
          <Suspense fallback={null}>
            <Physics gravity={[0, -20, 0]}>
              {storePreview ? (
                <>
                  <mesh position={[0, -0.025, (STORE.minZ + STORE.maxZ) / 2]} receiveShadow>
                    <boxGeometry args={[STORE.maxX - STORE.minX, 0.05, STORE.maxZ - STORE.minZ]} />
                    <meshStandardMaterial color="#e4dfd2" roughness={0.85} />
                  </mesh>
                  <StoreInterior />
                  {SHELVES.map((zone) => (
                    <Shelf key={zone.id} zone={zone} />
                  ))}
                </>
              ) : (
                <WarungScene />
              )}
            </Physics>
          </Suspense>
        </Canvas>
        <div
          className="mmo-hud pointer-events-none absolute inset-0"
          data-touch={innerWidth < 1000}
        >
          {!storePreview && <WarungHud />}
        </div>
        <PreviewManagementSheet />
        {!inside && !storePreview && (
          <button className="warung-preview-return" type="button" onClick={seed}>
            Kembali ke preview warung
          </button>
        )}
        {query.has("controls") && (
          <aside className="warung-preview-controls" aria-label="Kontrol preview">
            <span>Data uji · {scenario}</span>
            <button type="button" onClick={seed}>
              Ulangi skenario
            </button>
          </aside>
        )}
      </div>
    </GameViewport>
  );
}

createRoot(document.getElementById("root")!).render(<Preview />);
