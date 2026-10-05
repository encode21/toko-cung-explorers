/** @jsxImportSource @/game/jsx */
import { Component, Suspense, useEffect, useMemo, useRef, type ReactNode } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { clone } from "three/addons/utils/SkeletonUtils.js";
import * as T from "three";
import { DEFAULT_AVATAR, OUTFIT_UNIFORM, type AvatarConfig } from "@/identity/avatar";
import { createAvatarSource, type AvatarAnimation } from "./avatar-source";
import { avatarSurfaceY } from "./grounding";

export const BASE_AVATAR_URL = "/assets/characters/base-avatar-v2.glb";

/** Match `Player` locomotion so Walk/Run clips sit near timeScale 1 at normal speeds. */
const WALK_REF_SPEED = 4.2;
const RUN_REF_SPEED = 7.4;
/** Enter/exit bands avoid Idle↔Walk↔Run thrash when measured gait jitters. */
const WALK_ENTER = 0.35;
const WALK_EXIT = 0.1;
const RUN_ENTER = 5.1;
const RUN_EXIT = 4.4;
const LOCO_BLEND = 0.28;
const LOCO_BLEND_LOCK = 0.18;

export interface AvatarV2Props {
  avatar?: AvatarConfig | undefined;
  character?: string | null | undefined;
  /** Actual horizontal metres / second, not a boolean walking flag. */
  speed?: number | { current: number };
  animation?: AvatarAnimation | { current: AvatarAnimation | undefined } | undefined;
  modelUrl?: string;
  fallback?: boolean;
  silhouette?: boolean;
  groundToWorld?: boolean;
}
class AssetBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  override state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  override render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}
let fallbackAsset: ReturnType<typeof createAvatarSource> | undefined;
function Fallback(props: AvatarV2Props) {
  fallbackAsset ??= createAvatarSource();
  return <Rig {...props} asset={fallbackAsset} />;
}
function Loaded(props: AvatarV2Props) {
  const asset = useGLTF(props.modelUrl ?? BASE_AVATAR_URL);
  return <Rig {...props} asset={asset} />;
}
/** Controller-independent feet-origin renderer. Never scales the canonical player root. */
export function BaseAvatarV2(props: AvatarV2Props) {
  if (props.fallback) return <Fallback {...props} />;
  return (
    <AssetBoundary key={props.modelUrl ?? BASE_AVATAR_URL} fallback={<Fallback {...props} />}>
      <Suspense fallback={null}>
        <Loaded {...props} />
      </Suspense>
    </AssetBoundary>
  );
}
function Rig({
  asset,
  avatar = DEFAULT_AVATAR,
  character,
  speed = 0,
  animation,
  silhouette = false,
  groundToWorld = false,
}: AvatarV2Props & { asset: { scene: T.Group; animations: T.AnimationClip[] } }) {
  const rig = useMemo(() => {
    const scene = clone(asset.scene) as T.Group;
    const materials = new Map<string, T.MeshStandardMaterial>();
    const meshes: T.SkinnedMesh[] = [];
    let skeleton: T.Skeleton | undefined;
    scene.traverse((o) => {
      if (!(o instanceof T.SkinnedMesh)) return;
      const original = o.material as T.MeshStandardMaterial;
      if (!materials.has(original.name)) materials.set(original.name, original.clone());
      o.material = materials.get(original.name)!;
      skeleton ??= o.skeleton;
      o.skeleton = skeleton;
      o.castShadow = true;
      o.receiveShadow = false;
      // Shared fixed animation bounds avoids per-frame CPU skinning for bounds.
      o.boundingSphere = new T.Sphere(new T.Vector3(0, 0.85, 0), 1.35);
      o.frustumCulled = true;
      meshes.push(o);
    });
    const mixer = new T.AnimationMixer(scene);
    const clips = [...asset.animations];
    for (const name of ["Walk", "Run"]) {
      const walk = asset.animations.find((c) => c.name === name),
        carry = asset.animations.find((c) => c.name === "CarryBox");
      if (walk && carry) {
        const combined = walk.clone();
        combined.name = `Carry${name}`;
        for (const track of combined.tracks) {
          if (!/(UpperArm|LowerArm|Hand)\.quaternion$/.test(track.name)) continue;
          const pose = carry.tracks.find((t) => t.name === track.name);
          if (pose)
            for (let i = 0; i < track.values.length; i++) track.values[i] = pose.values[i % 4]!;
        }
        clips.push(combined);
      }
    }
    const actions = new Map<string, T.AnimationAction>();
    return {
      scene,
      materials,
      meshes,
      mixer,
      actions,
      skeleton,
      clips,
      soles: meshes.find((m) => m.name === "BodySoles"),
    };
  }, [asset]);
  const active = useRef<T.AnimationAction | null>(null),
    age = useRef(Math.random() * 3);
  const smoothedSpeed = useRef(0);
  const locoState = useRef<"Idle" | "Walk" | "Run">("Idle");
  const blendUntil = useRef(0);
  const soleY = useRef(0);
  const world = useMemo(() => new T.Vector3(), []);
  const vertex = useMemo(() => new T.Vector3(), []);
  const root = useRef<T.Group>(null);
  const placement = useRef<T.Group>(null);
  useEffect(() => {
    const koko = character === "koko-cung";
    const colors: Record<string, string> = {
      Skin: avatar.skin,
      Top: koko ? "#bd433d" : (OUTFIT_UNIFORM[avatar.outfit] ?? avatar.outfitColor),
      Bottom: avatar.pantsColor ?? "#334454",
      Shoes: avatar.shoesColor ?? "#303c49",
      Hair: koko ? "#241c19" : avatar.hairColor,
    };
    for (const [name, mat] of rig.materials) {
      if (silhouette) mat.color.set("#131b24");
      else if (colors[name]) mat.color.set(colors[name]);
    }
    // Restore fixed palette after silhouette mode as well.
    if (!silhouette)
      asset.scene.traverse((o) => {
        if (o instanceof T.SkinnedMesh) {
          const m = o.material as T.MeshStandardMaterial;
          if (!colors[m.name]) rig.materials.get(m.name)?.color.copy(m.color);
        }
      });
  }, [avatar, character, silhouette, rig, asset]);
  useEffect(() => {
    active.current = null;
    for (const clip of rig.clips) rig.actions.set(clip.name, rig.mixer.clipAction(clip));
    return () => {
      rig.mixer.stopAllAction();
      rig.mixer.uncacheRoot(rig.scene);
      rig.actions.clear();
      rig.materials.forEach((m) => m.dispose());
      rig.skeleton?.dispose();
    };
  }, [rig, asset]);
  useFrame(({ camera }, raw) => {
    const dt = Math.min(raw, 0.05),
      rawSpeed = typeof speed === "number" ? speed : speed.current;
    // Damp measured gait so one physics hitch doesn't restart the clip or spike timeScale.
    smoothedSpeed.current = T.MathUtils.damp(smoothedSpeed.current, Math.max(0, rawSpeed), 12, dt);
    const velocity = smoothedSpeed.current;
    const requested = typeof animation === "object" ? animation.current : animation;

    let loco = locoState.current;
    if (loco === "Idle" && velocity > WALK_ENTER) loco = "Walk";
    else if (loco === "Walk" && velocity < WALK_EXIT) loco = "Idle";
    else if (loco === "Walk" && velocity > RUN_ENTER) loco = "Run";
    else if (loco === "Run" && velocity < RUN_EXIT) loco = "Walk";
    locoState.current = loco;

    const target =
      requested === "CarryBox" && loco !== "Idle"
        ? `Carry${loco === "Run" ? "Run" : "Walk"}`
        : (requested ?? (loco === "Idle" ? "Idle" : loco));
    const next = rig.actions.get(target) ?? rig.actions.get("Idle")!;
    if (!next) return;
    age.current += dt;
    const locoClip =
      target === "Idle" ||
      target === "Walk" ||
      target === "Run" ||
      target.startsWith("Carry");
    // Lock short loco blends so Idle↔Walk chatter can't reset().crossFade every few frames.
    // Hit/Sit/Jump/etc. always switch immediately.
    if (next !== active.current && (!locoClip || age.current >= blendUntil.current)) {
      next.reset().setEffectiveWeight(1).play();
      if (target === "Hit" || target === "GetUp" || target === "Jump") {
        next.setLoop(T.LoopOnce, 1);
        next.clampWhenFinished = true;
      } else next.setLoop(T.LoopRepeat, Infinity);
      if (active.current) next.crossFadeFrom(active.current, LOCO_BLEND, false);
      active.current = next;
      if (locoClip) blendUntil.current = age.current + LOCO_BLEND_LOCK;
    }
    // Game characters move faster than real stride distance; scale cadence to
    // controller refs so Walk@4.2 / Run@7.4 sit near timeScale 1 (not 3–4×).
    const playing = active.current ?? next;
    let desiredScale = 1;
    const playingName = playing.getClip().name;
    if (!requested || requested === "CarryBox") {
      if (playingName.endsWith("Walk"))
        desiredScale = T.MathUtils.clamp(velocity / WALK_REF_SPEED, 0.7, 1.15);
      else if (playingName.endsWith("Run"))
        desiredScale = T.MathUtils.clamp(velocity / RUN_REF_SPEED, 0.8, 1.2);
    }
    playing.timeScale = T.MathUtils.damp(playing.timeScale || 1, desiredScale, 10, dt);
    root.current?.getWorldPosition(world);
    if (placement.current)
      placement.current.position.y =
        groundToWorld && requested !== "Sit" && requested !== "Jump"
          ? Math.max(0, avatarSurfaceY(world) - world.y)
          : 0;
    const distance = camera.position.distanceTo(world),
      near = distance < 12;
    // Medium/far tiers omit facial and accessory draw calls; far animation ticks at 15 Hz.
    if (distance < 24 || Math.floor(age.current * 15) !== Math.floor((age.current - dt) * 15))
      rig.mixer.update(distance < 24 ? dt : 1 / 15);
    // Plant soles for standing loco only — Sit/Jump/Fall lift the whole mesh if planted.
    const plantSoles =
      requested !== "Sit" &&
      requested !== "Jump" &&
      requested !== "Fall" &&
      requested !== "GetUp" &&
      requested !== "Hit";
    const previousSoleY = soleY.current;
    rig.scene.position.y = 0;
    if (plantSoles) {
      rig.scene.updateMatrixWorld(true);
      rig.skeleton?.update();
      const soles = rig.soles;
      if (soles) {
        const p = soles.geometry.getAttribute("position");
        let lowest = Infinity;
        for (let i = 0; i < p.count; i++) {
          vertex.fromBufferAttribute(p, i);
          soles.applyBoneTransform(i, vertex);
          lowest = Math.min(lowest, vertex.y);
        }
        soleY.current = T.MathUtils.damp(previousSoleY, -lowest, 18, dt);
        rig.scene.position.y = soleY.current;
      }
    } else {
      soleY.current = T.MathUtils.damp(previousSoleY, 0, 20, dt);
      rig.scene.position.y = soleY.current;
    }
    const blink = age.current % 4.3 < 0.12;
    for (const m of rig.meshes) {
      let visible = true;
      if (m.name.startsWith("Hair_"))
        visible = m.name === `Hair_${character === "koko-cung" ? "buns" : avatar.hair}`;
      else if (m.name.startsWith("Outfit_")) visible = m.name === `Outfit_${avatar.outfit}`;
      else if (m.name.startsWith("Accessory_"))
        visible = near && m.name === `Accessory_${avatar.accessory}`;
      else if (m.name === "Badge") visible = near && avatar.outfit !== "casual";
      else if (m.name.startsWith("Eye"))
        visible =
          near &&
          !blink &&
          avatar.expression !== "calm" &&
          !(avatar.expression === "wink" && m.name === "EyeRight");
      else if (m.name.startsWith("Blink"))
        visible =
          near &&
          (blink ||
            avatar.expression === "calm" ||
            (avatar.expression === "wink" && m.name === "BlinkRight"));
      else if (["Smile", "TalkMouth", "Teeth", "Brows"].includes(m.name))
        visible =
          near &&
          (m.name === "Brows" ||
            (m.name === "Smile"
              ? target !== "Talk"
              : target === "Talk" || avatar.expression === "grin"));
      m.visible = visible;
      m.castShadow = distance < 18;
    }
  });
  return (
    <group
      ref={root}
      name="AvatarV2Visual"
      userData={{ ignoreCameraCollision: true }}
      dispose={null}
    >
      <group ref={placement}>
        <primitive object={rig.scene} />
        <mesh rotation-x={-Math.PI / 2} position-y={0.004} scale={[1, 0.65, 1]}>
          <circleGeometry args={[0.29, 24]} />
          <meshBasicMaterial color="#252c35" transparent opacity={0.12} depthWrite={false} />
        </mesh>
      </group>
    </group>
  );
}
