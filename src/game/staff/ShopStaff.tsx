/** @jsxImportSource @/game/jsx */
import { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { useWarung } from "@/game/warung/store";
import { Billboard, Text } from "@react-three/drei";
import { LodAvatar } from "@/game/npc/LodAvatar";
import { useStaff } from "./store";
import type { StaffKind } from "./types";

const LOOK: Partial<Record<StaffKind, { avatar: string; x: number }>> = {
  guard: { avatar: "npc-store-staff", x: -1.35 },
  courier: { avatar: "npc-courier", x: 1.35 },
};
/** Porch of the gang shop, on the city-lot teras, or behind the interior counter. */
const DEPTH = { porch: 4.4, lot: 3.2, counter: -2.15 } as const;

function StaffActor({
  kind,
  name,
  where,
}: {
  kind: StaffKind;
  name: string;
  where: keyof typeof DEPTH;
}) {
  const ref = useRef<Group>(null);
  const action = useWarung((s) => (where === "counter" && kind === "guard" ? s.guardAction : null));
  const look = LOOK[kind]!;
  useFrame((_, dt) => {
    if (!ref.current) return;
    const x = action?.kind === "confront" ? -0.85 : action ? -2.1 : look.x;
    ref.current.position.x += (x - ref.current.position.x) * Math.min(1, dt * 6);
  });
  return (
    <group ref={ref} position={[look.x, 0, DEPTH[where]]}>
      <LodAvatar
        lodId={`staff:${where}:${kind}`}
        avatarId={look.avatar}
        animation={action?.kind === "confront" ? "Angry" : action ? "Wave" : "Idle"}
      />
      <Billboard position={[0, 2.15, 0]} visible={!action}>
        <Text
          fontSize={0.16}
          maxWidth={2.4}
          textAlign="center"
          color="#fff6d0"
          outlineWidth={0.02}
          outlineColor="#3a2414"
        >
          {action?.kind === "confront" ? "😠 Penjaga warung" : action ? "Melayani antrean" : name}
        </Text>
      </Billboard>
    </group>
  );
}

const FAREWELL_KEY = "tc-staff-farewell-seen";
const WAVE_SECONDS = 4;
const WALK_SECONDS = 4;
const FAREWELL_MAX_AGE_MS = 24 * 60 * 60 * 1000;
const seenFarewell = () => {
  try {
    return Number(localStorage.getItem(FAREWELL_KEY) ?? 0);
  } catch {
    return 0;
  }
};

/** One-shot goodbye: the unpaid employee waves with their message, then walks off toward the street. */
function FarewellActor({
  id,
  kind,
  text,
  where,
  onDone,
}: {
  id: number;
  kind: StaffKind;
  text: string;
  where: keyof typeof DEPTH;
  onDone: () => void;
}) {
  const ref = useRef<Group>(null);
  const clock = useRef(0);
  const [walking, setWalking] = useState(false);
  const look = LOOK[kind]!;
  useFrame((_, dt) => {
    if (!ref.current) return;
    clock.current += dt;
    if (clock.current > WAVE_SECONDS && !walking) setWalking(true);
    if (clock.current > WAVE_SECONDS) ref.current.position.z += dt * 1.4;
    if (clock.current > WAVE_SECONDS + WALK_SECONDS) {
      try {
        localStorage.setItem(FAREWELL_KEY, String(id));
      } catch {
        /* private mode: the goodbye may replay once, harmless */
      }
      onDone();
    }
  });
  return (
    <group ref={ref} position={[look.x, 0, DEPTH[where]]}>
      <LodAvatar
        lodId={`staff-farewell:${where}:${kind}`}
        avatarId={look.avatar}
        animation={walking ? "Walk" : "Wave"}
      />
      <Billboard position={[0, 2.3, 0]} visible={!walking}>
        <Text
          fontSize={0.15}
          maxWidth={2.6}
          textAlign="center"
          color="#fff6d0"
          outlineWidth={0.02}
          outlineColor="#3a2414"
        >
          {text}
        </Text>
      </Billboard>
    </group>
  );
}

/** Hired warung staff, standing where the shop actually is. */
export function ShopStaff({ where }: { where: keyof typeof DEPTH }) {
  const staff = useStaff((s) => s.data?.staff);
  const messages = useStaff((s) => s.data?.messages);
  const [seen, setSeen] = useState(seenFarewell);
  const hired = (staff ?? []).filter(
    (e) => e.business === "warung" && e.status === "active" && LOOK[e.kind],
  );
  // Newest unseen departure of a warung employee who is still gone (not rehired since).
  const farewell = messages?.find(
    (m) =>
      m.type === "STAFF_LEFT" &&
      m.id > seen &&
      // A new device or cleared storage must not replay an old goodbye.
      Date.now() - Date.parse(m.at) < FAREWELL_MAX_AGE_MS &&
      LOOK[m.kind] &&
      !hired.some((e) => e.kind === m.kind),
  );
  if (!hired.length && !farewell) return null;
  return (
    <group name={`ShopStaff-${where}`}>
      {hired.map((member) => (
        <StaffActor key={member.kind} kind={member.kind} name={member.name} where={where} />
      ))}
      {farewell && (
        <FarewellActor
          key={farewell.id}
          id={farewell.id}
          kind={farewell.kind}
          text={farewell.text}
          where={where}
          onDone={() => setSeen(farewell.id)}
        />
      )}
    </group>
  );
}
