/** @jsxImportSource @/game/jsx */
import { Billboard, Text } from "@react-three/drei";
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

const NET_TICK = 1 / 8;
const tmp = new THREE.Vector3();
const ANIM_SET = new Set<string>(AVATAR_ANIMATIONS);

function asAnim(value: string | undefined): AvatarAnimation | undefined {
  if (!value || !ANIM_SET.has(value)) return undefined;
  return value as AvatarAnimation;
}

function RemoteAvatar({
  id,
  name,
  role,
  avatar,
  character,
  register,
}: {
  id: string;
  name: string;
  role?: string | undefined;
  avatar?: AvatarConfig | undefined;
  character?: string | null | undefined;
  register: (id: string, g: THREE.Group | null) => void;
}) {
  const ref = useRef<THREE.Group>(null);
  const bubble = useNet((s) => {
    const last = [...s.chat].reverse().find((m) => m.from === id);
    return last && Date.now() - last.at < 8000 ? last.text : null;
  });
  const gait = useRef(0);
  const poseAnim = useRef<AvatarAnimation | undefined>(undefined);
  const roleDef = roleById(role);
  const attach = useCallback(
    (g: THREE.Group | null) => {
      ref.current = g;
      register(id, g);
    },
    [id, register],
  );

  return (
    <>
      <group visible={false} ref={attach}>
        <BaseAvatarV2
          avatar={avatar ?? avatarFromSeed(id)}
          character={character}
          speed={gait}
          animation={poseAnim}
          groundToWorld
        />
        <Billboard position={[0, 2.2, 0]}>
          <Text fontSize={0.24} color="#fff6e6" outlineColor="#2b2118" outlineWidth={0.02}>
            {name}
          </Text>
          <Text
            position={[0, -0.23, 0]}
            fontSize={0.14}
            color={roleDef.color}
            outlineColor="#2b2118"
            outlineWidth={0.015}
          >
            {roleDef.icon} {roleDef.name}
          </Text>
          {bubble && (
            <Text
              position={[0, 0.34, 0]}
              fontSize={0.2}
              maxWidth={4}
              color="#ffe9c4"
              outlineColor="#2b2118"
              outlineWidth={0.02}
            >
              {bubble}
            </Text>
          )}
        </Billboard>
        <MotionClip id={id} speedRef={gait} animRef={poseAnim} />
      </group>
      <PersonCollider target={ref} />
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

    const netAnim = asAnim(remoteStates.get(id)?.anim);
    const social = peekRemoteSocialAnim(id);
    const pose = social ?? netAnim;
    animRef.current = pose;

    const posed =
      pose === "Sit" ||
      pose === "Hit" ||
      pose === "Fall" ||
      pose === "GetUp" ||
      pose === "Wave" ||
      pose === "Jump";

    const speed = posed ? 0 : g.position.distanceTo(prev.current) / Math.max(delta, 0.001);
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
  const acc = useRef(0);
  const last = useRef({ x: 0, y: 0, z: 0, ry: 0, anim: "" as string | undefined, at: -1 });

  const register = useCallback((id: string, g: THREE.Group | null) => {
    if (g) {
      g.name = `remote-${id}`;
      groups.current.set(id, g);
    } else {
      groups.current.delete(id);
    }
  }, []);

  useFrame(({ clock }, rawDelta) => {
    const delta = Math.min(rawDelta, 0.05);
    const t = 1 - Math.exp(-12 * delta);

    for (const [id, s] of remoteStates) {
      const g = groups.current.get(id);
      if (!g) continue;
      g.visible = true;
      tmp.set(s.x, s.y - 0.83, s.z);
      if (g.position.distanceTo(tmp) > 6) g.position.copy(tmp);
      else g.position.lerp(tmp, t);
      const dy = s.ry - g.rotation.y;
      g.rotation.y += Math.atan2(Math.sin(dy), Math.cos(dy)) * t;
    }

    acc.current += delta;
    if (acc.current < NET_TICK) return;
    acc.current = 0;
    const channel = getActiveChannel();
    if (!channel || (typeof document !== "undefined" && document.hidden)) return;

    const { playerPos, playerYaw } = useGame.getState();
    const x = Math.round(playerPos[0] * 100) / 100;
    const y = Math.round(playerPos[1] * 100) / 100;
    const z = Math.round(playerPos[2] * 100) / 100;
    const ry = Math.round(playerYaw * 100) / 100;
    const anim = getLocalNetAnim();
    const l = last.current;
    const moved =
      Math.abs(x - l.x) + Math.abs(y - l.y) + Math.abs(z - l.z) + Math.abs(ry - l.ry) > 0.01;
    const animChanged = (anim ?? "") !== (l.anim ?? "");
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
            role={p.role}
            avatar={p.avatar}
            character={p.character}
            register={register}
          />
        ))}
    </>
  );
}
