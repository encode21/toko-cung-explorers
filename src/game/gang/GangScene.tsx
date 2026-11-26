/** @jsxImportSource @/game/jsx */
import { Plang } from "@/game/world/Plang";
import { PropertyBeacon, PropertySign } from "@/game/world/PropertySign";
import { useEffect, useMemo, useRef, useState } from "react";
import { Text } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { CuboidCollider, RigidBody } from "@react-three/rapier";
import { ArchitectureBatch } from "@/game/world/ArchitectureBatch";
import { CoastalBridge } from "@/game/world/CoastalBridge";
import { GANG_BRIDGE_LENGTH } from "@/game/world/bridges";
import { RoadSurface } from "@/game/world/RoadSurface";
import { ROAD_STYLE } from "@/game/world/road-surfaces";
import { TimedLampHeads } from "@/game/time/TimedFixtures";
import { NaturalTrees } from "@/game/world/NaturalTrees";
import type { TreeSpot } from "@/game/world/vegetation";
import type { OutdoorPart } from "@/game/world/OutdoorBatch";
import { useGame } from "@/state/game-store";
import { useProfile } from "@/identity/profile-store";
import {
  gangText,
  gangName,
  housePose,
  visibleHouses,
  type GangData,
  type GangHouse,
} from "./model";
import { gangArchitecture, gateParts } from "./architecture";
import { GangResidents } from "./GangResidents";
import { PakKades } from "./PakKades";
import { MbahSign, PartyDecor } from "./GangFinale";
import { GangPrologNpcs } from "@/game/prolog/pulang/GangPrologNpcs";
import { useGang } from "./store";
import { Halte } from "./Halte";
import { Empang } from "@/game/easyjobs/Empang";
import { gangHasEmpang } from "@/game/easyjobs/model";
import { Flood } from "@/game/weather/Flood";
import { EntryRing } from "@/game/home/EntryRing";
import { enterHome } from "@/game/home/store";
import { porch } from "@/game/prolog/pulang/steps";
import { CITY_HALTE_OFFSET, GANG_HALTE_LOCAL } from "./model";
import { naturalGroundMaterial } from "@/game/world/natural-ground";
import { GangBeach, GangGrass, GangSea } from "./GangNature";
import { GANG_WALL, LAND_HALF, LAND_START, LAWN_INSET, PLAY_HALF } from "./beach";
import { Kampung } from "./Kampung";
import { ShopStaff } from "@/game/staff/ShopStaff";
import { RenovationSite } from "@/game/warung/RenovationSite";
import { DeliveryFleet } from "@/game/warung/KulakanDeliveryScene";

const GANG_SIDEWALK_EDGE = 5.4;

function House({ house, data }: { house: GangHouse; data: GangData }) {
  const parts = useMemo(() => gangArchitecture(house), [house]);
  const city = house.warung?.lot != null;
  const title = house.warung?.name ?? (house.ownerId || house.mine ? "Rumah" : data.text["empty"]);
  return (
    <>
      <ArchitectureBatch items={parts.masonry} surface="masonry" />
      <ArchitectureBatch items={parts.trim} surface="trim" />
      <ArchitectureBatch items={parts.glazing} surface="glazing" />
      {house.style.lamp.id !== "none" && <TimedLampHeads positions={[[0, 2.7, 2.8]]} />}
      {house.ownerId && house.warung?.lot === null && house.warung.level === 1 && (
        <Plang
          text="WARUNG SEMBAKO"
          position={[0, 2.35, 4.03]}
          size={0.2}
          board="#f1e2c2"
          textColor="#2a4f8a"
        />
      )}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider
          args={[house.warung?.level === 5 && !city ? 7 : 5, 2, 4.5]}
          position={[0, 2, -2]}
        />
        {house.ownerId && house.warung?.lot === null && house.warung.level === 1 && (
          <CuboidCollider args={[2.3, 1.3, 0.6]} position={[0, 1.3, 3.4]} />
        )}
      </RigidBody>
      <Text
        position={[0, 3.76, 7.52]}
        fontSize={0.46}
        maxWidth={9.5}
        color="#fff8e6"
        outlineWidth={0.012}
        outlineColor="#17281f"
        textAlign="center"
      >
        {`${house.number} · ${title}`}
      </Text>
      <Text
        position={[0, 3.25, 7.52]}
        fontSize={0.27}
        maxWidth={9.5}
        color="#ffde89"
        outlineWidth={0.008}
        outlineColor="#17281f"
        textAlign="center"
      >
        {city
          ? `Pindah ke kota · Toko #${house.warung!.lot! + 1} · Dekati tanda kuning`
          : house.inactive
            ? "Toko tidak aktif · Belum bisa dikunjungi"
            : house.warung?.renovation
              ? `Renovasi jadi ${house.warung.renovation.levelName} · Pintu di tanda kuning`
              : house.warung
                ? `${house.warung.levelName} · ${house.warung.open ? "Buka" : "Tutup saat ini"} · Pintu di tanda kuning`
                : house.mine
                  ? "Belum buka warung · Dekati tanda kuning"
                  : house.ownerId
                    ? "Rumah warga · Belum ada warung"
                    : "Rumah kosong · Belum ada penghuni"}
      </Text>
      {house.mbahSign && <MbahSign text={house.mbahSign} />}
      {house.party && <PartyDecor />}
      {house.mine && house.warung && house.warung.lot == null && <ShopStaff where="porch" />}
      {house.warung?.renovation && house.warung.lot == null && (
        <RenovationSite
          renovation={house.warung.renovation}
          width={house.warung.level === 5 ? 14 : 10}
          front={7.4}
          height={house.warung.level === 3 ? 6.2 : house.warung.level === 5 ? 5 : 3.6}
        />
      )}
    </>
  );
}
const cityGate = gateParts();
const laneGate = gateParts(6.2);
export function GangGate() {
  const data = useGang((s) => s.data);
  if (!data) return null;
  return (
    <group position={[data.layout.gate.x, 0, data.layout.gate.z]}>
      <ArchitectureBatch items={cityGate} surface="masonry" />
      <Text position={[0, 7, 0.32]} fontSize={0.58} color="#fff1d2">
        {data.text["gate"]}
      </Text>
      <group position={[6.2, 1.9, 1.8]}>
        <mesh>
          <boxGeometry args={[2.6, 2.4, 0.18]} />
          <meshStandardMaterial color="#3d5b49" />
        </mesh>
        <Text
          position={[0, 0.55, 0.12]}
          fontSize={0.27}
          maxWidth={2.3}
          color="#fff1d2"
          textAlign="center"
        >
          {data.text["directory"]}
        </Text>
        <Text
          position={[0, -0.2, 0.12]}
          fontSize={0.22}
          maxWidth={2.1}
          color="#e0cfb2"
          textAlign="center"
        >
          {data.text["open_now"]}
        </Text>
      </group>
      <Halte
        position={[CITY_HALTE_OFFSET.x, 0, CITY_HALTE_OFFSET.z]}
        yaw={CITY_HALTE_OFFSET.yaw}
        label={data.text["halte"] ?? "HALTE · Gang Kampung"}
      />
      <RigidBody type="fixed" colliders={false}>
        {[-4.9, 4.9].map((x) => (
          <CuboidCollider key={x} args={[0.6, 3.8, 0.6]} position={[x, 3.8, 0]} />
        ))}
      </RigidBody>
    </group>
  );
}
/** Own house: walk into the yellow ring to go inside (distinct from the warung's F button). */
function HomeDoorRing() {
  useGang((s) => s.data);
  const door = porch();
  return door ? <EntryRing position={door} label="Masuk rumah" onEnter={enterHome} /> : null;
}
export function GangScene() {
  const data = useGang((s) => s.data);
  return data ? (
    <>
      <GangStreet data={data} />
      <DeliveryFleet area="gang" />
      <mesh
        position={[
          data.layout.origin[0],
          0.012,
          data.layout.origin[2] + Math.ceil(data.houses.length / 2) * data.layout.house_spacing - 2,
        ]}
        rotation-x={-Math.PI / 2}
      >
        <planeGeometry args={[14, 22]} />
        <meshStandardMaterial color="#393d3b" />
      </mesh>
      <HomeDoorRing />
    </>
  ) : null;
}
function GangStreet({ data }: { data: GangData }) {
  const profileName = useProfile((s) => s.profile?.displayName.trim());
  const [visible, setVisible] = useState(() =>
    visibleHouses(data, useGame.getState().playerPos[0], useGame.getState().playerPos[2]).map(
      (h) => h.number,
    ),
  );
  const elapsed = useRef(1);
  useFrame((_, dt) => {
    elapsed.current += dt;
    if (elapsed.current < 0.25) return;
    elapsed.current = 0;
    const p = useGame.getState().playerPos;
    const next = visibleHouses(data, p[0], p[2]).map((h) => h.number);
    setVisible((old) => (old.join() === next.join() ? old : next));
  });
  const end = Math.ceil(data.houses.length / 2) * data.layout.house_spacing + 10;
  const lawn = useMemo(() => naturalGroundMaterial(), []);
  useEffect(() => () => lawn.dispose(), [lawn]);
  const surfaces = useMemo(() => {
    const rect = (x0: number, z0: number, x1: number, z1: number) => [
      { x: x0, z: z0 },
      { x: x1, z: z0 },
      { x: x1, z: z1 },
      { x: x0, z: z1 },
    ];
    const start = LAND_START - GANG_BRIDGE_LENGTH,
      finish = end + GANG_BRIDGE_LENGTH;
    const road = [rect(-3.2, start, 3.2, finish)],
      walk = [
        rect(-GANG_SIDEWALK_EDGE, start, -3.2, finish),
        rect(3.2, start, GANG_SIDEWALK_EDGE, finish),
      ];
    const parts: OutdoorPart[] = [];
    for (let z = start + 1; z < finish; z++)
      for (const x of [-3.25, 3.25])
        parts.push({
          p: [x, 0.075, z],
          s: [0.13, 0.15, 0.98],
          color: z % 2 ? "#e7e6df" : "#343c36",
        });
    for (let z = start + 2; z < finish; z += 3)
      parts.push({ p: [0, 0.05, z], s: [0.12, 0.012, 1.5], color: "#eceeea" });
    for (const h of data.houses) {
      const p = housePose(h.number, data.layout);
      walk.push(
        rect(
          p.x < 0 ? -10 : GANG_SIDEWALK_EDGE,
          p.z - 2,
          p.x < 0 ? -GANG_SIDEWALK_EDGE : 10,
          p.z + 2,
        ),
      );
    }
    for (let z = 0; z < end; z += 24) {
      const x = z % 48 === 0 ? -5 : 5;
      parts.push(
        { p: [x, 2.05, z], s: [0.1, 4.1, 0.1], color: "#39453e" },
        { p: [x, 4.15, z], s: [0.65, 0.15, 0.5], color: "#465247" },
        { p: [x, 4.02, z], s: [0.5, 0.12, 0.36], color: "#dcd6b6" },
      );
    }
    const lamps: [number, number, number][] = [];
    for (let z = 0; z < end; z += 24) lamps.push([z % 48 === 0 ? -5 : 5, 4.02, z]);
    return { road, walk, parts, lamps };
  }, [data.houses, data.layout, end]);
  const trees = useMemo(() => {
    const result: TreeSpot[] = [];
    for (const h of data.houses.filter((h) => visible.includes(h.number))) {
      const p = housePose(h.number, data.layout);
      result.push({
        x: data.layout.origin[0] + Math.sign(p.x) * 7.3,
        z: data.layout.origin[2] + p.z + 8,
        y: 0,
        scale: 0.65,
        seed: h.number,
      });
      if (h.style.plants.id !== "none")
        for (const x of [-4.4, 4.4])
          result.push({
            x: data.layout.origin[0] + p.x + Math.sin(p.yaw) * 6.7,
            z: data.layout.origin[2] + p.z - Math.sin(p.yaw) * x,
            y: 0.5,
            scale: 0.17,
            seed: h.number + 1,
          });
    }
    return result;
  }, [data, visible]);
  return (
    <>
      <group position={data.layout.origin}>
        <GangResidents data={data} />
        <PakKades />
        {/* Inset so GangBeach's blended rim (not a hard box edge) meets the sand. */}
        <mesh position={[0, -0.1, (end + LAND_START) / 2]} material={lawn} receiveShadow>
          <boxGeometry
            args={[(LAND_HALF - LAWN_INSET) * 2, 0.2, end - LAND_START - LAWN_INSET * 2]}
          />
        </mesh>
        <GangBeach end={end} />
        <Flood width={PLAY_HALF * 2} from={LAND_START} to={end} />
        <Kampung gang={data.gang} from={LAND_START} to={end} />
        <group name="Bridge-to-city" position={[0, 0, LAND_START]} rotation-y={Math.PI}>
          <CoastalBridge length={GANG_BRIDGE_LENGTH} />
        </group>
        <group name="Bridge-to-next-gang" position={[0, 0, end]}>
          <CoastalBridge length={GANG_BRIDGE_LENGTH} />
        </group>
        <RoadSurface
          name="ConnectedAsphalt"
          contours={surfaces.road}
          height={ROAD_STYLE.asphaltY}
          color={ROAD_STYLE.asphalt}
          colliders={false}
        />
        <RoadSurface
          name="ConnectedSidewalks"
          contours={surfaces.walk}
          height={ROAD_STYLE.sidewalkY}
          color="#936e5b"
          colliders={false}
        />
        <ArchitectureBatch items={surfaces.parts} surface="trim" />
        <TimedLampHeads positions={surfaces.lamps} />
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider
            args={[LAND_HALF, 0.1, (end - LAND_START) / 2]}
            position={[0, -0.1, (end + LAND_START) / 2]}
          />
          {/* Side walls: the kampung (kali east, house rows west) carries on past the walkable lane. */}
          {[-1, 1].map((side) => (
            <CuboidCollider
              key={side}
              args={[0.3, 6, (end - LAND_START) / 2 + GANG_WALL]}
              position={[side * (PLAY_HALF + 0.3), 3, (end + LAND_START) / 2]}
            />
          ))}
          {[LAND_START - GANG_WALL, end + GANG_WALL].flatMap((z) =>
            [-1, 1].map((side) => (
              <CuboidCollider
                key={`${z}:${side}`}
                args={[(LAND_HALF + GANG_WALL - 5.6) / 2, 6, 0.3]}
                position={[(side * (LAND_HALF + GANG_WALL + 5.6)) / 2, 3, z]}
              />
            )),
          )}
        </RigidBody>
        {data.houses.map((house) => {
          const inView = visible.includes(house.number);
          if (!inView && !house.mine) return null;
          const p = housePose(house.number, data.layout);
          const ownerName = (house.mine && profileName) || house.ownerName?.trim();
          // Both rows put the plaque on the approach side of the paved entrance.
          const signPosition: [number, number, number] = [
            p.x < 0 ? 3.4 : -3.4,
            0,
            Math.abs(p.x) - GANG_SIDEWALK_EDGE - 0.4,
          ];
          return (
            <group key={house.number} position={[p.x, 0, p.z]} rotation-y={p.yaw}>
              {inView && <House house={house} data={data} />}
              {(house.ownerId || house.mine) && ownerName && (
                <>
                  <PropertySign
                    ownerName={ownerName}
                    kind={house.warung?.lot === null ? "warung" : "rumah"}
                    position={signPosition}
                  />
                  {house.mine && <PropertyBeacon position={signPosition} />}
                </>
              )}
            </group>
          );
        })}
        {gangHasEmpang(data.gang) && <Empang origin={data.layout.origin} />}
        <Halte
          yaw={Math.PI / 2}
          position={GANG_HALTE_LOCAL}
          label={data.text["halte_city"] ?? "HALTE · ke Kota"}
        />
        <group position={[0, 0, -10]}>
          <ArchitectureBatch items={laneGate} surface="masonry" />
          <Text position={[0, 5.6, 0.32]} fontSize={0.42} color="#fff1d2">
            {data.text["leave"]}
          </Text>
        </group>
        <group position={[0, 0, end - 5]} rotation-y={Math.PI}>
          <ArchitectureBatch items={laneGate} surface="masonry" />
          <Text position={[0, 5.6, 0.32]} fontSize={0.36} color="#fff1d2">
            {[
              data.neighbors.previous
                ? gangText(data, "previous_gang", { gang: data.neighbors.previous })
                : "",
              data.neighbors.next ? gangText(data, "next_gang", { gang: data.neighbors.next }) : "",
            ]
              .filter(Boolean)
              .join(" · ") || gangName(data)}
          </Text>
        </group>
      </group>
      <GangSea data={data} end={end} />
      <GangGrass data={data} end={end} />
      <NaturalTrees spots={trees} />
      <GangPrologNpcs />
    </>
  );
}
