/** @jsxImportSource @/game/jsx */
import { FLIGHT_ANIMATIONS, isFlightAnimation } from "@/game/avatar/flight-clips";
import { useMobility } from "@/game/mobility/store";
import {
  blendCarryMount,
  createCarryBlend,
  remoteRenderPose,
  pruneRenderPoses,
} from "@/game/mobility/render-pose";
import { activePair, passengerPose } from "@/game/mobility/model";
import { PlayerChatBubble } from "./PlayerChatBubble";
import { PlayerNameBadge } from "./PlayerNameBadge";
import { useHud } from "@/state/hud-store";
import { gameUiBlocked } from "@/state/game-ui-store";
import { useChannels } from "@/net/channel-store";
import { useClub } from "@/game/club/store";
import { DungeonParcel } from "@/game/dungeon/DungeonScene";
import { useFrame } from "@react-three/fiber";
import { useCallback, useRef } from "react";
import * as THREE from "three";
import { useNet, type RemoteState } from "@/net/net-store";
import { getLocalNetAnim } from "@/net/local-pose";
import { getActiveChannel, playerId, remoteStates } from "@/net/useWorldChannel";
import { useGame } from "@/state/game-store";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import { AVATAR_ANIMATIONS, type AvatarAnimation } from "@/game/avatar/avatar-source";
import { avatarFromSeed, type AvatarConfig } from "@/identity/avatar";
import { roleById } from "@/identity/roles";
import { PersonCollider } from "@/game/physics/PersonCollider";
import { peekRemoteSocialAnim } from "@/game/social/social-actions";
import { isChatEmoteAnimation } from "@/game/social/chat-emotes";
import { isSwimAnimation, SWIM_ANIMATIONS } from "@/game/avatar/swim-clips";
import { isJumpAnimation, JUMP_ANIMATIONS } from "@/game/avatar/jump-clips";

const NET_TICK = 1 / 8;
const tmp = new THREE.Vector3();
const ANIM_SET = new Set<string>([
  ...AVATAR_ANIMATIONS,
  ...JUMP_ANIMATIONS,
  ...SWIM_ANIMATIONS,
  ...FLIGHT_ANIMATIONS,
  "Piggyback",
]);

function asAnim(value: string | undefined): AvatarAnimation | undefined {
  if (!value || !ANIM_SET.has(value)) return undefined;
  return value as AvatarAnimation;
}

function RemoteAvatar({
  id,
  name,
  userId,
  role,
  avatar,
  character,
  register,
}: {
  id: string;
  name: string;
  userId?: string | undefined;
  role?: string | undefined;
  avatar?: AvatarConfig | undefined;
  character?: string | null | undefined;
  register: (id: string, g: THREE.Group | null) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const gait = useRef(0);
  const poseAnim = useRef<AvatarAnimation | undefined>(undefined);
  const roleDef = roleById(role);
  const carried = useMobility((s) =>
    s.carries.some((p) => p.status === "active" && p.passenger === id),
  );
  const activeDj = useClub((s) => s.data?.activeDjId === id);
  const attach = useCallback(
    (g: THREE.Group | null) => {
      ref.current = g;
      register(id, g);
    },
    [id, register],
  );

  return (
    <>
      <group
        visible={false}
        ref={attach}
        userData={{ playerId: id }}
        onClick={(event) => {
          if (!gameUiBlocked()) {
            event.stopPropagation();
            useHud.setState({ selectedPlayer: id });
          }
        }}
      >
        {userId && <DungeonParcel playerId={userId} />}
        <BaseAvatarV2
          playerAvatar
          avatar={avatar ?? avatarFromSeed(id)}
          character={character}
          speed={gait}
          animation={poseAnim}
          dancePlayerId={id}
          groundToWorld
        />
        <PlayerNameBadge
          name={name}
          seed={userId ?? id}
          subtitle={activeDj ? "🎧 DJ · Cung Underground" : `${roleDef.icon} ${roleDef.name}`}
        />
        <PlayerChatBubble senderId={id} />
        <MotionClip id={id} speedRef={gait} animRef={poseAnim} />
      </group>
      <PersonCollider target={ref} escapeOverlap disabled={carried} />
    </>
  );
}

/** Pose dari net (Sit/Hit/…) + gait dari pergerakan. */
function MotionClip({
  id,
  speedRef,
  animRef,
}: {
  id: string;
  speedRef: { current: number };
  animRef: { current: AvatarAnimation | undefined };
}) {
  const prev = useRef(new THREE.Vector3());
  const initialized = useRef(false);

  useFrame(({ scene }, delta) => {
    const g = scene.getObjectByName(`remote-${id}`);
    if (!g) return;

    const carried = activePair(useMobility.getState().carries, id)?.passenger === id;
    const netAnim = carried ? "Piggyback" : asAnim(remoteStates.get(id)?.anim);
    const social = peekRemoteSocialAnim(id);
    const pose =
      carried || isJumpAnimation(netAnim) || isSwimAnimation(netAnim) || isFlightAnimation(netAnim)
        ? netAnim
        : (social ?? netAnim);
    animRef.current = pose;

    const posed =
      isFlightAnimation(pose) ||
      isChatEmoteAnimation(pose) ||
      pose === "Sit" ||
      pose === "Piggyback" ||
      pose === "Hit" ||
      pose === "Fall" ||
      pose === "GetUp" ||
      pose === "Wave" ||
      pose === "Drink";

    // Vertical jump travel must not turn a stationary hop into a running gait.
    const speed = posed
      ? 0
      : Math.hypot(g.position.x - prev.current.x, g.position.z - prev.current.z) /
        Math.max(delta, 0.001);
    prev.current.copy(g.position);
    speedRef.current = initialized.current
      ? THREE.MathUtils.damp(speedRef.current, Math.min(speed, 7.4), 10, delta)
      : 0;
    initialized.current = true;
  });

  return null;
}

export function RemotePlayers() {
  const name = useNet((s) => s.name) || "Pengunjung";
  const roster = useNet((s) => s.roster);
  const groups = useRef(new Map<string, THREE.Group>());
  const mounts = useRef(new Map<string, ReturnType<typeof createCarryBlend>>());
  const acc = useRef(0);
  const last = useRef({ x: 0, y: 0, z: 0, ry: 0, anim: "" as string | undefined, at: -1 });

  const register = useCallback((id: string, g: THREE.Group | null) => {
    if (g) {
      g.name = `remote-${id}`;
      const initial = remoteStates.get(id);
      if (initial) {
        g.position.set(initial.x, initial.y - 0.83, initial.z);
        g.rotation.y = initial.ry;
      }
      groups.current.set(id, g);
    } else {
      groups.current.delete(id);
    }
  }, []);

  useFrame(({ clock, scene }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    pruneRenderPoses(remoteStates.keys());
    const activeCarries = useMobility.getState().carries.filter((p) => p.status === "active");
    for (const id of mounts.current.keys())
      if (!activeCarries.some((p) => p.id === id)) mounts.current.delete(id);

    for (const [id, s] of remoteStates) {
      const g = groups.current.get(id);
      if (!g) continue;
      g.visible = s.y < -5 === (useClub.getState().inside && !useClub.getState().outdoor);
      if (activeCarries.some((pair) => pair.passenger === id)) continue;
      const pose = remoteRenderPose(id, s, clock.elapsedTime, delta);
      g.position.set(pose.x, pose.y - 0.83, pose.z);
      g.rotation.y = pose.ry;
    }

    // Attach passengers after carriers interpolate, so observers see one coherent pair.
    for (const pair of useMobility.getState().carries) {
      if (pair.status !== "active") continue;
      const passenger = groups.current.get(pair.passenger);
      if (!passenger) continue;
      const carrier = groups.current.get(pair.carrier);
      const game = useGame.getState();
      const local = scene.getObjectByName("Player");
      if (local) local.getWorldPosition(tmp);
      const localYaw =
        local?.getObjectByName("CharacterVisual")?.parent?.rotation.y ?? game.playerYaw;
      const pose =
        pair.carrier === playerId
          ? local
            ? { x: tmp.x, y: tmp.y, z: tmp.z, ry: localYaw }
            : {
                x: game.playerPos[0],
                y: game.playerPos[1],
                z: game.playerPos[2],
                ry: game.playerYaw,
              }
          : carrier
            ? {
                x: carrier.position.x,
                y: carrier.position.y + 0.83,
                z: carrier.position.z,
                ry: carrier.rotation.y,
              }
            : null;
      if (pose) {
        let mount = mounts.current.get(pair.id);
        if (!mount) {
          mount = createCarryBlend();
          mounts.current.set(pair.id, mount);
        }
        const target = blendCarryMount(
          mount,
          pair.id,
          {
            x: passenger.position.x,
            y: passenger.position.y + 0.83,
            z: passenger.position.z,
            ry: passenger.rotation.y,
          },
          passengerPose(pose),
          delta,
        );
        passenger.position.set(target.x, target.y - 0.83, target.z);
        passenger.rotation.y = target.ry;
      }
    }
    acc.current += delta;
    const anim = getLocalNetAnim();
    const animChanged = (anim ?? "") !== (last.current.anim ?? "");
    // The 60ms anticipation is shorter than an 8Hz tick; transmit pose edges immediately.
    if (acc.current < NET_TICK && !animChanged) return;
    acc.current = 0;
    const channel = getActiveChannel();
    if (!channel || (typeof document !== "undefined" && document.hidden)) return;

    const { playerPos, playerYaw } = useGame.getState();
    const x = Math.round(playerPos[0] * 100) / 100;
    const y = Math.round(playerPos[1] * 100) / 100;
    const z = Math.round(playerPos[2] * 100) / 100;
    const ry = Math.round(playerYaw * 100) / 100;
    const l = last.current;
    const moved =
      Math.abs(x - l.x) + Math.abs(y - l.y) + Math.abs(z - l.z) + Math.abs(ry - l.ry) > 0.01;
    const stale = clock.elapsedTime - l.at > 1;
    if (!moved && !animChanged && !stale) return;

    last.current = { x, y, z, ry, anim, at: clock.elapsedTime };
    void channel.send({
      type: "broadcast",
      event: "state",
      payload: { id: playerId, name, x, y, z, ry, anim } satisfies RemoteState,
    });
  });

  return (
    <>
      {roster
        .filter((p) => p.id !== playerId)
        .map((p) => (
          <RemoteAvatar
            key={p.id}
            id={p.id}
            name={p.name}
            userId={p.userId}
            role={p.role}
            avatar={p.avatar}
            character={p.character}
            register={register}
          />
        ))}
    </>
  );
}
