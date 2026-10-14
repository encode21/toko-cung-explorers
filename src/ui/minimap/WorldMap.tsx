import * as Tabs from "@radix-ui/react-tabs";
import { useEffect, useId, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Navigation,
  ShoppingBasket,
  Store,
  Truck,
  UserRound,
  Users,
  Warehouse,
} from "lucide-react";
import { LOW_QUALITY } from "@/game/engine/quality";
import { populationForQuality } from "@/game/npc/population";
import { PLACES } from "@/game/world/places";
import { useNet } from "@/net/net-store";
import { playerId, remoteStates } from "@/net/useWorldChannel";
import { useGame } from "@/state/game-store";
import { MAP_LEGEND, Minimap } from "./Minimap";

const LEGEND_ICONS: Record<string, typeof Store> = {
  Rak: ShoppingBasket,
  Kasir: CircleDollarSign,
  Mitra: Store,
  Gudang: Warehouse,
  Toko: Store,
  Pemain: Users,
  Kamu: Navigation,
};
const RESIDENTS = populationForQuality(LOW_QUALITY);
const NEARBY_RADIUS = 30;

function NearbyPlayers() {
  const roster = useNet((s) => s.roster);
  const [x, , z] = useGame((s) => s.playerPos);
  const [, refresh] = useState(0);
  // Remote positions live outside React; refresh only while this tab is visible.
  useEffect(() => {
    const timer = window.setInterval(() => refresh((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, []);
  const nearby = roster
    .flatMap((person) => {
      const position = remoteStates.get(person.id);
      if (person.id === playerId || !position) return [];
      const distance = Math.hypot(position.x - x, position.z - z);
      return distance <= NEARBY_RADIUS ? [{ ...person, distance }] : [];
    })
    .sort((a, b) => a.distance - b.distance);

  return (
    <>
      <p className="game-map-caption">Pemain dalam jarak {NEARBY_RADIUS} meter darimu.</p>
      {nearby.length === 0 ? (
        <p className="game-map-empty">Belum ada pemain lain di sekitarmu.</p>
      ) : (
        <ul className="game-map-legend-list">
          {nearby.map((person) => (
            <li key={person.id}>
              <span className="game-map-symbol game-map-player-symbol" aria-hidden="true">
                <UserRound />
              </span>
              <div>
                <strong>{person.name}</strong>
                <span>{Math.round(person.distance)} m darimu</span>
              </div>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** Full-screen world map; the legend occupies its own column when expanded. */
export function WorldMap() {
  const [legendOpen, setLegendOpen] = useState(false);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const stage = useRef<HTMLDivElement>(null);
  const legendId = useId();

  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () => {
      const width = Math.max(1, Math.round(element.clientWidth));
      const height = Math.max(1, Math.round(element.clientHeight));
      setSize((current) =>
        current.width === width && current.height === height ? current : { width, height },
      );
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="game-world-map" data-legend-open={legendOpen}>
      <section
        id={legendId}
        aria-label="Legenda peta"
        className="game-map-drawer"
        hidden={!legendOpen}
      >
        {legendOpen && (
          <Tabs.Root defaultValue="region" className="game-map-tabs">
            <Tabs.List aria-label="Informasi peta" className="game-map-tablist">
              <Tabs.Trigger value="region">Informasi Wilayah</Tabs.Trigger>
              <Tabs.Trigger value="residents">Penduduk</Tabs.Trigger>
              <Tabs.Trigger value="players">Pemain di Sekitar</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="region" className="game-map-legend-content">
              <ul className="game-map-legend-list">
                {MAP_LEGEND.map((item) => {
                  const Icon = LEGEND_ICONS[item.label] ?? Store;
                  return (
                    <li key={item.label}>
                      <span
                        className="game-map-symbol"
                        style={{ backgroundColor: item.color }}
                        aria-hidden="true"
                      >
                        <Icon />
                      </span>
                      <strong>{item.label === "Kamu" ? "Lokasimu" : item.label}</strong>
                    </li>
                  );
                })}
              </ul>
              <h3 className="game-map-section-title">Lokasi di sekitar toko</h3>
              <ul className="game-map-legend-list">
                {PLACES.map((place) => (
                  <li key={place.id}>
                    <span className="game-map-symbol" aria-hidden="true">
                      {place.tone === "courier" ? <Truck /> : <Store />}
                    </span>
                    <div>
                      <strong>{place.name}</strong>
                      <span>{place.tone === "courier" ? "Ekspedisi" : "Mitra Toko Cung"}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </Tabs.Content>
            <Tabs.Content value="residents" className="game-map-legend-content">
              <ul className="game-map-legend-list">
                {RESIDENTS.map((resident) => (
                  <li key={resident.id}>
                    <span className="game-map-symbol" aria-hidden="true">
                      <UserRound />
                    </span>
                    <strong>{resident.label}</strong>
                  </li>
                ))}
              </ul>
            </Tabs.Content>
            <Tabs.Content value="players" className="game-map-legend-content">
              <NearbyPlayers />
            </Tabs.Content>
          </Tabs.Root>
        )}
      </section>
      <div ref={stage} className="game-map-stage">
        <Minimap
          size={size.width}
          height={size.height}
          range={120}
          follow={false}
          detailed
          labels={legendOpen}
        />
        <button
          type="button"
          className="game-map-legend-toggle"
          aria-label={legendOpen ? "Tutup legenda peta" : "Buka legenda peta"}
          aria-expanded={legendOpen}
          aria-controls={legendId}
          onClick={() => setLegendOpen((open) => !open)}
        >
          {legendOpen ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        </button>
      </div>
    </div>
  );
}
