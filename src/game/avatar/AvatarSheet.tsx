/** @jsxImportSource @/game/jsx */
import { Canvas, useFrame } from "@react-three/fiber";
import { Suspense, useEffect, useRef, useState } from "react";
import { useGLTF } from "@react-three/drei";
import { BASE_AVATAR_URL, BaseAvatarV2 } from "./BaseAvatarV2";
import { EXPLORER_URL } from "./explorer-rig";
import { normalizeAvatar } from "@/identity/avatar";

type Job = { id: string; avatar: unknown; character?: string | null };
const PARENT_ORIGIN = /^https:\/\/([a-z0-9-]+\.)*tokocung\.com$|^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;
const SIZE = 192;
const SETTLE_FRAMES = 8;

function Snapshot({ onShot }: { onShot: (image: string) => void }) {
  // BaseAvatarV2 suspends internally, so wait for its models here or the first portrait is empty.
  useGLTF(BASE_AVATAR_URL);
  useGLTF(EXPLORER_URL);
  const frames = useRef(0);
  useFrame(({ gl, scene, camera }) => {
    if (++frames.current !== SETTLE_FRAMES) return;
    gl.render(scene, camera);
    onShot(gl.domElement.toDataURL("image/png"));
  });
  return null;
}

/** Renders appearance configs to portraits on one WebGL context, since a table of live canvases would exceed the browser limit. */
export default function AvatarSheet() {
  const [queue, setQueue] = useState<Job[]>([]);
  const parent = useRef("");
  useEffect(() => {
    const receive = (e: MessageEvent) => {
      if (e.source !== window.parent || !PARENT_ORIGIN.test(e.origin)) return;
      if (e.data?.type !== "avatar-sheet:render" || !Array.isArray(e.data.jobs)) return;
      parent.current = e.origin;
      setQueue(e.data.jobs.slice(0, 100));
    };
    window.addEventListener("message", receive);
    window.parent.postMessage({ type: "avatar-sheet:ready" }, "*");
    return () => window.removeEventListener("message", receive);
  }, []);
  const job = queue[0];
  return (
    <div style={{ width: SIZE, height: SIZE }}>
      <Canvas
        dpr={1}
        gl={{ preserveDrawingBuffer: true, alpha: true }}
        camera={{ position: [0, 1.35, 2.3], fov: 26 }}
        onCreated={({ camera }) => camera.lookAt(0, 1.3, 0)}
      >
        <hemisphereLight args={["#eef6ff", "#baa58d", 2]} />
        <directionalLight position={[3, 4, 4]} intensity={2} />
        <directionalLight position={[-3, 2, -2]} intensity={0.6} />
        {job && (
          <Suspense key={job.id} fallback={null}>
            <BaseAvatarV2
              playerAvatar
              avatar={normalizeAvatar(job.avatar)}
              character={job.character}
              animation="Idle"
            />
            <Snapshot
              onShot={(image) => {
                window.parent.postMessage({ type: "avatar-sheet:image", id: job.id, image }, parent.current);
                setQueue((q) => q.slice(1));
              }}
            />
          </Suspense>
        )}
      </Canvas>
    </div>
  );
}
