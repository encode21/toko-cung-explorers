/** @jsxImportSource @/game/jsx */
import { isFlightAnimation } from "./flight-clips";
import { createSelfiePose } from "@/game/photo/selfie-pose";
import { usePhoto } from "@/game/photo/photo-store";
import { useHud } from "@/state/hud-store";
import { isSwimAnimation } from "./swim-clips";
import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as T from "three";
import { explorerClips } from "./explorer-clips";
import { DEFAULT_EXPLORER } from "@/identity/explorer";
import { createExplorerRig, EXPLORER_SCALE, EXPLORER_URL } from "./explorer-rig";
import type { AvatarV2Props } from "./BaseAvatarV2";
import { avatarSurfaceY } from "./grounding";
import { clubNow, danceFor } from "../club/store";
import { isJumpAnimation, jumpBlendSeconds } from "./jump-clips";

export function ExplorerAvatar({
  selfieCamera = false,
  avatar,
  speed = 0,
  animation,
  groundToWorld,
  silhouette,
  dancePlayerId,
}: AvatarV2Props) {
  const asset = useGLTF(EXPLORER_URL);
  const legacy = useGLTF("/assets/characters/base-avatar-v2.glb");
  const clips = useMemo(() => explorerClips(asset.animations, legacy.animations), [asset, legacy]);
  const rig = useMemo(() => createExplorerRig(asset.scene, clips), [asset, clips]);
  const selfiePose = useMemo(() => createSelfiePose(rig.scene), [rig]);
  const root = useRef<T.Group>(null),
    placement = useRef<T.Group>(null);
  const world = useMemo(() => new T.Vector3(), []);
  const active = useRef<T.AnimationAction | null>(null),
    velocity = useRef(0),
    walking = useRef(false),
    running = useRef(false);
  useEffect(() => {
    rig.apply(avatar?.explorer ?? DEFAULT_EXPLORER, silhouette);
  }, [rig, avatar?.explorer, silhouette]);
  useEffect(() => {
    active.current = null;
    return () => rig.dispose();
  }, [rig]);
  useFrame((_, delta) => {
    selfiePose.restore();
    const dt = Math.min(delta, 0.1);
    velocity.current = T.MathUtils.damp(
      velocity.current,
      typeof speed === "number" ? speed : speed.current,
      12,
      dt,
    );
    walking.current = velocity.current > (walking.current ? 0.1 : 0.35);
    running.current = velocity.current > (running.current ? 5.0 : 5.8);
    const requested = typeof animation === "object" ? animation.current : animation;
    const dance = dancePlayerId && !requested && !walking.current ? danceFor(dancePlayerId) : null;
    const locomotion = running.current ? "Run" : walking.current ? "Walk" : "Idle";
    const name = dance
      ? `Dance_${dance.id}`
      : requested === "CarryBox"
        ? `Carry${locomotion}`
        : requested && !["Idle", "Walk", "Run"].includes(requested)
          ? requested
          : locomotion;
    const next = rig.actions.get(name) ?? rig.actions.get(locomotion)!;
    if (active.current !== next) {
      const previousName = active.current?.getClip().name;
      const strideTime =
        ["Walk", "Run", "Idle"].includes(name) && isJumpAnimation(previousName) ? next.time : 0;
      next.reset().setEffectiveWeight(1).play();
      next.time = strideTime;
      const once =
        isJumpAnimation(name) || ["Hit", "GetUp", "Wave", "Drink", "Angry", "Laugh"].includes(name);
      next.setLoop(once ? T.LoopOnce : T.LoopRepeat, once ? 1 : Infinity);
      next.clampWhenFinished = true;
      if (active.current)
        next.crossFadeFrom(active.current, jumpBlendSeconds(name, previousName), false);
      active.current = next;
    }
    const cadence = name.endsWith("Walk")
      ? T.MathUtils.clamp(velocity.current / 4.2, 0.7, 1.55)
      : name.endsWith("Run")
        ? T.MathUtils.clamp(velocity.current / 7.4, 0.8, 1.2)
        : 1;
    next.timeScale = T.MathUtils.damp(next.timeScale, cadence, 10, dt);
    if (dance)
      next.time = Math.max(0, (clubNow() - dance.startedAt) / 1000) % next.getClip().duration;
    const cup = rig.scene.getObjectByName("DrinkCup");
    if (cup) cup.visible = name === "Drink" && next.time > 0.2 && next.time < 2.9;
    rig.mixer.update(dt);
    if (
      selfieCamera &&
      useHud.getState().sheet === "camera" &&
      usePhoto.getState().mode === "selfie"
    )
      selfiePose.apply();
    root.current?.getWorldPosition(world);
    if (placement.current)
      placement.current.position.y =
        groundToWorld &&
        world.y > -5 &&
        requested !== "Sit" &&
        requested !== "Piggyback" &&
        !isJumpAnimation(requested) &&
        !isSwimAnimation(requested) &&
        !isFlightAnimation(requested)
          ? Math.max(0, avatarSurfaceY(world) - world.y)
          : 0;
  });
  return (
    <group ref={root}>
      <group ref={placement}>
        <group scale={EXPLORER_SCALE}>
          <primitive object={rig.scene} dispose={null} />
        </group>
      </group>
    </group>
  );
}
