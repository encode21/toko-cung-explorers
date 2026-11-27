/** @jsxImportSource @/game/jsx */
import { EntryRing } from "@/game/home/EntryRing";
import { useGang } from "@/game/gang/store";
import { gangHalte, houseFront, ownPorchWarung } from "@/game/gang/model";
import { useWarung } from "@/game/warung/store";
import {
  canStartWarungEntry,
  cityWarungEntrance,
  gangWarungEntrance,
  startWarungEntry,
  type WarungEntrance,
} from "@/game/warung/entrance";
import { WARUNG_LOTS, lotFront } from "@/game/warung/lots";
import { USAHA_LOTS, usahaOpen } from "@/game/usaha/model";
import { useWorldEditor } from "@/game/editor/store";
import { useDungeon } from "@/game/dungeon/store";
import { canStartClubDoorWalk, startClubDoorWalk } from "@/game/club/venue-actions";
import { clubDoorLayout } from "@/game/club/door-layout";
import { DUNGEON_ENABLED } from "@/game/dungeon/availability";
import { CITY_HELIPAD, MOUNTAIN_HELIPAD } from "@/game/mountain/model";
import { BUS_STOPS } from "./bus-routes";
import { openBusMenu } from "./halte-actions";
import { STORE_ENTRY_PULSE, WAREHOUSE } from "./layout";

export type EntryArea = "city" | "gang" | "club" | "mountain" | "none";

function WarungEntryRing({ entrance, label }: { entrance: WarungEntrance; label: string }) {
  return (
    <EntryRing
      position={entrance.ring}
      groundY={0.2}
      label={label}
      canEnter={canStartWarungEntry}
      onEnter={() => startWarungEntry(entrance)}
    />
  );
}

/** Only actual entrances get a ring: empty decorative buildings and unavailable businesses do not. */
export function WorldEntryMarkers({ area }: { area: EntryArea }) {
  const gang = useGang((s) => s.data);
  const lots = useWarung((s) => s.lots);
  const targets = useWorldEditor((s) => s.targets);
  const dungeon = useDungeon((s) => s.data?.config);
  if (area === "none") return null;
  if (area === "mountain")
    return (
      <EntryRing
        position={[...MOUNTAIN_HELIPAD.boarding]}
        groundY={MOUNTAIN_HELIPAD.boarding[1]}
        label="Naik helikopter · Kota"
      />
    );
  if (area === "gang") {
    if (!gang) return null;
    const end = Math.ceil(gang.houses.length / 2) * gang.layout.house_spacing + 5;
    const ownShop = ownPorchWarung(gang);
    return (
      <group name="GangEntryMarkers">
        <EntryRing
          position={gangHalte(gang.layout)}
          groundY={0.2}
          label="Halte · Jadwal & tujuan bus"
          onEnter={() => openBusMenu("kampung")}
        />
        {gang.houses
          .filter(
            (h) => (!h.inactive && h.warung) || (h.mine && (!h.warung || h.warung === ownShop)),
          )
          .map((h) => {
            const shop = h.warung;
            return shop?.lot === null ? (
              <WarungEntryRing
                key={h.number}
                entrance={gangWarungEntrance(shop.id, h.number, gang.layout)}
                label={shop === ownShop ? "Masuk warung atau rumah" : `Masuk ${shop.name}`}
              />
            ) : (
              <EntryRing
                key={h.number}
                position={houseFront(h.number, gang.layout)}
                groundY={0.2}
                label={shop ? `Ke ${shop.name} · Kota #${shop.lot! + 1}` : "Buka warung di rumah"}
              />
            );
          })}
        {(["previous", "next"] as const).map(
          (side) =>
            gang.neighbors[side] && (
              <EntryRing
                key={side}
                position={[
                  gang.layout.origin[0] + (side === "previous" ? 4 : -4),
                  0,
                  gang.layout.origin[2] + end,
                ]}
                groundY={0.2}
                label={`Ke Kampung ${gang.neighbors[side]}`}
              />
            ),
        )}
      </group>
    );
  }
  return (
    <group name="WorldEntryMarkers">
      {targets
        .filter(
          (t) => t.active && t.type === "CLUB_ENTRANCE" && t.position.y < -5 === (area === "club"),
        )
        .map((door) => {
          const passage = clubDoorLayout(door);
          return (
            <EntryRing
              key={door.id}
              position={passage.marker}
              groundY={passage.marker[1]}
              label={passage.exit ? "Keluar ke kota" : "Masuk Cung Underground"}
              canEnter={() => canStartClubDoorWalk(door)}
              onEnter={() => startClubDoorWalk(door)}
            />
          );
        })}
      {area === "city" && (
        <>
          {Object.values(BUS_STOPS).map((stop) => (
            <EntryRing
              key={stop.id}
              position={stop.board}
              groundY={0.2}
              label={`${stop.name} · Bus`}
              onEnter={() => openBusMenu(stop.id)}
            />
          ))}
          <EntryRing position={STORE_ENTRY_PULSE.position} groundY={0.12} label="Masuk Toko Cung" />
          <EntryRing position={[0, 0, WAREHOUSE.minZ - 1.5]} groundY={0.12} label="Masuk gudang" />
          {lots.map((card) => {
            const lot = WARUNG_LOTS[card.lot];
            if (!lot) return null;
            return (
              <WarungEntryRing
                key={`warung:${card.id}`}
                entrance={cityWarungEntrance(card.id, lot)}
                label={`Masuk ${card.name}`}
              />
            );
          })}
          {(["warteg", "kos"] as const).filter(usahaOpen).map((kind) => {
            const [x, z] = lotFront(USAHA_LOTS[kind]);
            return (
              <EntryRing
                key={kind}
                position={[x, 0, z]}
                groundY={0.2}
                label={kind === "warteg" ? "Masuk Warteg" : "Masuk Kos-kosan"}
              />
            );
          })}
          {gang?.layout.gate && (
            <EntryRing
              position={[gang.layout.gate.x + 6.2, 0, gang.layout.gate.z + 1.8]}
              groundY={0.2}
              label="Kunjungi Gang Kampung"
            />
          )}
          {DUNGEON_ENABLED && dungeon && (
            <EntryRing position={dungeon.entrance} groundY={0.2} label="Principal · Pilih misi" />
          )}
          <EntryRing
            position={[...CITY_HELIPAD.boarding]}
            groundY={CITY_HELIPAD.boarding[1]}
            label="Naik helikopter · Gunung"
          />
        </>
      )}
    </group>
  );
}
