/** @jsxImportSource @/game/jsx */
import { GameDropdown } from "@/ui/game-ui/GameDropdown";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { useRef, useState, type ComponentRef } from "react";
import { BaseAvatarV2 } from "./BaseAvatarV2";
import { AVATAR_ANIMATIONS, type AvatarAnimation } from "./avatar-source";
import {
  DEFAULT_AVATAR,
  HAIR_STYLES,
  SKIN_TONES,
  OUTFIT_COLORS,
  OUTFITS,
  type AvatarConfig,
} from "@/identity/avatar";

/** Isolated developer quality gate. Exactly one hero; no population migration here. */
export default function AvatarViewer() {
  const [avatar, setAvatar] = useState<AvatarConfig>({ ...DEFAULT_AVATAR, outfitColor: "#446f85" });
  const [animation, setAnimation] = useState<AvatarAnimation>("Idle");
  const controls = useRef<ComponentRef<typeof OrbitControls>>(null);
  const [angle, setAngle] = useState(0),
    [silhouette, setSilhouette] = useState(false),
    [fallback, setFallback] = useState(false),
    [inside, setInside] = useState(false);
  return (
    <main
      style={{
        height: "100dvh",
        background: "#dfe5e8",
        color: "#243343",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <header style={{ padding: "12px 18px", background: "#f8fafb" }}>
        <strong>Toko Cung · Base Avatar V2</strong>
        <span style={{ marginLeft: 12 }}>
          Development quality gate · 1.74 m · GLB / shared 20-joint rig
        </span>
      </header>
      <section style={{ flex: 1, minHeight: 200 }}>
        <Canvas shadows camera={{ position: [0, 1.15, 4.8], fov: 34 }} dpr={[1, 1.5]}>
          <color attach="background" args={[inside ? "#e4dfd7" : "#dfe5e8"]} />
          <hemisphereLight args={["#e9f5ff", "#b4a08c", 2]} />
          <directionalLight
            position={[3, 5, 4]}
            intensity={inside ? 1.6 : 2.4}
            castShadow
            shadow-mapSize={[1024, 1024]}
          />
          <directionalLight position={[-3, 2, -2]} intensity={0.7} />
          <group rotation-y={angle}>
            <BaseAvatarV2
              avatar={avatar}
              animation={animation}
              silhouette={silhouette}
              fallback={fallback}
            />
          </group>
          <mesh rotation-x={-Math.PI / 2} position-y={-0.002} receiveShadow>
            <planeGeometry args={[100, 100]} />
            <meshStandardMaterial color={inside ? "#bdb5a9" : "#c5cfd3"} roughness={0.9} />
          </mesh>
          <OrbitControls
            ref={controls}
            target={[0, 0.86, 0]}
            minDistance={1.5}
            maxDistance={8}
            maxPolarAngle={Math.PI * 0.49}
          />
        </Canvas>
      </section>
      <aside
        style={{
          padding: 14,
          display: "flex",
          gap: 12,
          flexWrap: "wrap",
          background: "#f8fafb",
          alignItems: "center",
        }}
      >
        <label>
          Animation{" "}
          <GameDropdown
            aria-label="Animation"
            value={animation}
            onValueChange={(value) => setAnimation(value as AvatarAnimation)}
          >
            {AVATAR_ANIMATIONS.map((a) => (
              <option key={a}>{a}</option>
            ))}
          </GameDropdown>
        </label>
        <label>
          Hair{" "}
          <GameDropdown
            aria-label="Hair"
            value={avatar.hair}
            onValueChange={(value) => setAvatar({ ...avatar, hair: value as AvatarConfig["hair"] })}
          >
            {HAIR_STYLES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </GameDropdown>
        </label>
        <label>
          Outfit{" "}
          <GameDropdown
            aria-label="Outfit"
            value={avatar.outfit}
            onValueChange={(value) =>
              setAvatar({ ...avatar, outfit: value as AvatarConfig["outfit"] })
            }
          >
            {OUTFITS.map((a) => (
              <option key={a.id} value={a.id}>
                {a.label}
              </option>
            ))}
          </GameDropdown>
        </label>
        <label>
          Skin{" "}
          <GameDropdown
            aria-label="Skin"
            value={avatar.skin}
            onValueChange={(value) => setAvatar({ ...avatar, skin: value })}
          >
            {SKIN_TONES.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </GameDropdown>
        </label>
        <label>
          Shirt{" "}
          <GameDropdown
            aria-label="Shirt"
            value={avatar.outfitColor}
            onValueChange={(value) => setAvatar({ ...avatar, outfitColor: value })}
          >
            {["#446f85", ...OUTFIT_COLORS].map((c) => (
              <option key={c}>{c}</option>
            ))}
          </GameDropdown>
        </label>
        {["Front", "Side", "Back"].map((label, i) => (
          <button
            key={label}
            onClick={() => {
              controls.current?.object.position.set(0, 1.15, 4.8);
              controls.current?.target.set(0, 0.86, 0);
              controls.current?.update();
              setAngle([0, Math.PI / 2, Math.PI][i]!);
            }}
          >
            {label}
          </button>
        ))}
        <label>
          <input
            type="checkbox"
            checked={silhouette}
            onChange={(e) => setSilhouette(e.target.checked)}
          />{" "}
          Silhouette
        </label>
        <label>
          <input type="checkbox" checked={inside} onChange={(e) => setInside(e.target.checked)} />{" "}
          Indoor light
        </label>
        <label>
          <input
            type="checkbox"
            checked={fallback}
            onChange={(e) => setFallback(e.target.checked)}
          />{" "}
          Fallback
        </label>
      </aside>
    </main>
  );
}
