/** @jsxImportSource @/game/jsx */
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { NpcLabel } from "@/game/world/NpcLabel";
import { useEffect, useRef } from "react";
import type * as THREE from "three";
import { BaseAvatarV2 } from "@/game/avatar/BaseAvatarV2";
import type { AvatarAnimation } from "@/game/avatar/avatar-source";
import { NPC_AVATARS } from "@/identity/characters";
import { CASHIER_NPC_POS, COURIER_POS, OWNER_POS, type Vec3 } from "@/game/world/layout";
import { useMovingInteractable } from "@/game/interactions/dynamic";
import type { NpcRole } from "@/game/interactions/interactables";
import { useGame } from "@/state/game-store";
import { LOW_QUALITY } from "@/game/engine/quality";
import { trafficActors, trafficVehicles } from "@/game/traffic/traffic-runtime";
import { canImpact, impactVelocity, hitDurationFor } from "@/game/traffic/traffic-math";
import { emptyImpact, ImpactVfx } from "@/game/traffic/ImpactReaction";
import { PersonCollider } from "@/game/physics/PersonCollider";

function Idle({
  position,
  rotationY = 0,
  label,
  id,
  bob = 0,
}: {
  position: Vec3;
  rotationY?: number;
  label: string;
  id: string;
  bob?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const nearby = useGame((s) => s.nearby?.id === id);

  useFrame((state) => {
    const g = ref.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    g.position.y = position[1] + Math.abs(Math.sin(t * 1.6 + position[0])) * bob;
    g.rotation.y = rotationY + Math.sin(t * 0.7 + position[2]) * 0.12;
  });

  return (
    <>
      <group ref={ref} position={position}>
        <BaseAvatarV2 avatar={NPC_AVATARS[id]} animation={nearby ? "Talk" : "Idle"} groundToWorld />
        <NpcLabel text={label} />
      </group>
      <PersonCollider target={ref} />
    </>
  );
}

/** Pengunjung yang mondar-mandir di dalam toko. */
function Wanderer({
  a,
  b,
  speed = 1.1,
  id,
  label,
  persona,
  role,
}: {
  a: Vec3;
  b: Vec3;
  speed?: number;
  id: string;
  label: string;
  persona: string;
  role: NpcRole;
}) {
  const ref = useRef<THREE.Group>(null);
  const dir = useRef(1);
  const t = useRef(id === "npc-pedestrian-1" ? 0 : Math.random());
  const hit = useRef(emptyImpact());
  const animation = useRef<AvatarAnimation | undefined>(undefined);
  const gait = useRef(1);
  const nearby = useGame((s) => s.nearby?.id === id);
  useMovingInteractable(ref, { id, label, persona, role });
  useEffect(() => {
    if (a[2] < 3 || b[2] < 3) return;
    trafficActors.set(id, {
      position: () => ref.current?.position ?? null,
      hit: (vehicle, now) => {
        const g = ref.current;
        if (!g || !canImpact(now, hit.current.at)) return false;
        const kind = vehicle.kind === "truck" ? "truck" : "car";
        const v = impactVelocity(g.position, { ...vehicle, kind });
        hit.current = {
          at: now,
          x: g.position.x,
          z: g.position.z,
          vx: v.x,
          vz: v.z,
          vy: v.y,
          kind,
          recovered: false,
        };
        return true;
      },
    });
    return () => {
      trafficActors.delete(id);
    };
  }, [id, a, b]);

  useFrame(({ clock }, raw) => {
    const delta = Math.min(raw, 0.05);
    const g = ref.current;
    if (!g) return;
    const age = clock.elapsedTime - hit.current.at;
    const duration = hitDurationFor(hit.current.kind);
    animation.current =
      age < duration
        ? hit.current.kind === "truck"
          ? "Hit"
          : age < 0.22
            ? "Hit"
            : age < 0.65
              ? "Fall"
              : "GetUp"
        : undefined;
    if (age < duration) {
      gait.current = 0;
      const window = hit.current.kind === "truck" ? 0.4 : 0.7;
      if (age < window) {
        const fade = Math.exp((hit.current.kind === "truck" ? -4.2 : -3.5) * age);
        g.position.x += hit.current.vx * fade * delta;
        g.position.z += hit.current.vz * fade * delta;
      }
      return;
    }
    if (!hit.current.recovered) {
      hit.current.recovered = true;
      t.current = g.position.z < 20 ? 0 : 1;
      dir.current = t.current === 0 ? 1 : -1;
    }
    const atCurb =
      (g.position.z < 16.3 && dir.current === 1) || (g.position.z > 23.7 && dir.current === -1);
    if (
      id === "npc-pedestrian-1" &&
      atCurb &&
      [...trafficVehicles.values()].some((v) => Math.abs(v.x) < 10 && Math.abs(v.z - 20) < 4)
    ) {
      gait.current = 0;
      return;
    }
    if (nearby) {
      gait.current = 0;
      animation.current = "Talk";
      return;
    }
    const oldX = g.position.x,
      oldZ = g.position.z;
    t.current += delta * speed * 0.12 * dir.current;
    if (t.current > 1) {
      t.current = 1;
      dir.current = -1;
    }
    if (t.current < 0) {
      t.current = 0;
      dir.current = 1;
    }
    const k = t.current;
    g.position.x += (a[0] + (b[0] - a[0]) * k - g.position.x) * Math.min(1, delta * 12);
    g.position.z += (a[2] + (b[2] - a[2]) * k - g.position.z) * Math.min(1, delta * 12);
    gait.current = Math.min(
      4,
      Math.hypot(g.position.x - oldX, g.position.z - oldZ) / Math.max(delta, 0.001),
    );
    const target = Math.atan2((b[0] - a[0]) * dir.current, (b[2] - a[2]) * dir.current);
    const diff = Math.atan2(Math.sin(target - g.rotation.y), Math.cos(target - g.rotation.y));
    g.rotation.y += diff * (1 - Math.exp(-8 * Math.min(delta, 0.05)));
  });

  return (
    <>
      <group ref={ref} position={a}>
        <BaseAvatarV2 avatar={NPC_AVATARS[id]} speed={gait} animation={animation} groundToWorld />
        <group position={[0, 0.83, 0]}>
          <ImpactVfx hit={hit} />
        </group>
        <NpcLabel text={label} />
      </group>
      <PersonCollider target={ref} />
    </>
  );
}

export function Npcs() {
  return (
    <>
      <Idle id="npc-cashier" position={CASHIER_NPC_POS} rotationY={0} label="Mbak Rina · Kasir" />
      <Idle id="npc-owner" position={OWNER_POS} rotationY={0.6} label="Pak Cung · Owner" />
      <Idle id="npc-courier" position={COURIER_POS} rotationY={-Math.PI / 2} label="Kurir" />

      <Wanderer
        id="npc-shopper-1"
        role="pembeli"
        label="Bu Sari · Pembeli"
        persona="Bu Sari, ibu rumah tangga yang sedang belanja bulanan di Toko Cung. Ramah, suka bandingkan harga dan minta rekomendasi produk hemat."
        a={[-3.4, 0, -1.5]}
        b={[-3.4, 0, -10]}
      />
      <Wanderer
        id="npc-shopper-2"
        role="pembeli"
        label="Mas Dedi · Pembeli"
        persona="Mas Dedi, pelanggan langganan Toko Cung yang buru-buru cari minuman dan snack. Bicara singkat dan santai."
        a={[3.4, 0, -2]}
        b={[3.4, 0, -10.5]}
        speed={0.85}
      />
      <Wanderer
        id="npc-shopper-3"
        role="nakama-gudang"
        label="Nakama · Staf Toko"
        persona="Nakama Toko Cung yang berkeliling merapikan rak dan membantu pembeli menemukan lokasi produk."
        a={[-8, 0, 8]}
        b={[8, 0, 8]}
        speed={0.7}
      />
      <Wanderer
        id="npc-pedestrian-1"
        role="warga"
        label="Warga Sekitar"
        persona="Warga sekitar Toko Cung yang sedang jalan-jalan di depan toko. Suka cerita soal lingkungan, gudang, dan keramaian toko."
        a={[0, 0, 14.7]}
        b={[0, 0, 25]}
        speed={0.55}
      />
      {/* NPC tambahan hanya di perangkat kuat supaya ponsel tetap lancar. */}
      {!LOW_QUALITY && (
        <Wanderer
          id="npc-pedestrian-2"
          role="kurir"
          label="Nakama · Kurir"
          persona="Nakama kurir Toko Cung yang jalan menuju area loading dock. Tahu jadwal pickup dan status pengiriman."
          a={[0, 0, -14.5]}
          b={[6, 0, -19]}
          speed={0.6}
        />
      )}
    </>
  );
}
