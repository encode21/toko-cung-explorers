import { isMountainPosition } from "@/game/mountain/model";
import * as Tabs from "@radix-ui/react-tabs";
import { LOW_QUALITY } from "@/game/engine/quality";
import { populationForQuality } from "@/game/npc/population";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useHud } from "@/state/hud-store";
import { useGame } from "@/state/game-store";
import { useClub } from "@/game/club/store";
import { useDungeon } from "@/game/dungeon/store";
import { useNet } from "@/net/net-store";
import { playerId, remoteStates } from "@/net/useWorldChannel";
import { MAP_DESTINATIONS, type MapDestination } from "@/game/navigation/map-destinations";
import { useWorldGuidanceTarget } from "@/game/core/use-world-guidance";
import { resolveObjective } from "@/game/editor/resolve";
import { worldLandmarkFor } from "@/game/world/landmarks";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import { Minimap } from "./Minimap";
import { MapPoiIcon } from "./MapPoiIcon";
import { projectMapPoint } from "./map-layout";
import { useMapFocus } from "./map-focus";
import { WARUNG_LOTS } from "@/game/warung/lots";
import { rupiah } from "@/game/warung/model";
import { openWarungPanel, useWarung, warungCommand } from "@/game/warung/store";
import "./world-map.css";

type MapSpot = Omit<MapDestination, "id"> & { id: MapDestination["id"] | "active-quest" };

const ZOOMS = [1, 1.7, 2.8];
const LOT_TONE = { sale: "sale", soon: "soon", exclusive: "exclusive" } as const;

/** Greedy label declutter: a label is shown only if no earlier shown label is too close. */
function visibleLabels(points: { id: string; x: number; y: number }[]) {
  const shown: { x: number; y: number }[] = [];
  const ids = new Set<string>();
  for (const p of points) {
    if (shown.some((s) => Math.abs(s.x - p.x) < 86 && Math.abs(s.y - p.y) < 34)) continue;
    shown.push(p);
    ids.add(p.id);
  }
  return ids;
}

/** DOM markers keep touch targets, keyboard focus and detail dialogs accessible. */
export function CityMap() {
  const [legendOpen, setLegendOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [size, setSize] = useState({ width: 1, height: 1 });
  const [center, setCenter] = useState<{ x: number; z: number } | null>(null);
  const [zoom, setZoom] = useState(0);
  const [showLots, setShowLots] = useState(() => useMapFocus.getState().lots);
  const [selectedLot, setSelectedLot] = useState<number | null>(null);
  const lotCards = useWarung((s) => s.lots);
  const lotMarket = useWarung((s) => s.data?.lotMarket);
  const myWarung = useWarung((s) => s.data?.warung ?? null);
  const warungBusy = useWarung((s) => s.busy);
  useEffect(() => useMapFocus.setState({ lots: false }), []);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<{ id: number; x: number; y: number; cx: number; cz: number } | null>(null);
  const playerPos = useGame((s) => s.playerPos);
  const waypoint = useGame((s) => s.waypoint);
  const underground = useClub((s) => s.inside && !s.outdoor);
  const dungeon = useDungeon((s) => s.data?.instance);
  const roster = useNet((s) => s.roster);
  const questTarget = useWorldGuidanceTarget(true);
  const [, refresh] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => refresh((n) => n + 1), 500);
    return () => window.clearInterval(timer);
  }, []);
  useEffect(() => {
    const element = stage.current;
    if (!element) return;
    const measure = () =>
      setSize({
        width: Math.max(1, element.clientWidth),
        height: Math.max(1, element.clientHeight),
      });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const range = underground ? 36 : 240 / ZOOMS[zoom]!;
  const view = { ...size, range, x: center?.x ?? 0, z: center?.z ?? (underground ? 0 : 8) };
  const project = (x: number, z: number) => projectMapPoint(x, z, view);
  const spots: MapSpot[] = underground ? [] : [...MAP_DESTINATIONS];
  const objective = questTarget?.objective;
  // Hidden/secret clues stay discoverable in the world, not exposed by the map.
  if (questTarget?.realm === "WORLD" && !objective?.hidden && !objective?.secret) {
    const resolved = objective ? resolveObjective(objective) : null;
    const position = resolved
      ? resolved.targetId
        ? resolved.position
        : worldLandmarkFor(resolved.target, resolved.position)
      : questTarget.position;
    if (position.every(Number.isFinite))
      spots.push({
        id: "active-quest",
        label: objective?.label || "Tujuan quest",
        detail:
          objective?.hint || "Lanjutkan perjalanan menuju tujuan quest yang sedang kamu ikuti.",
        icon: "quest",
        position,
      });
  }
  const selected = spots.find((s) => s.id === selectedId);
  // Project the original location directly: no collision offsets or edge clamping.
  // Interior destinations remain available in the location drawer.
  const pins = spots
    .filter((s) => !s.interior)
    .map((s) => ({
      ...s,
      ...project(s.marker?.[0] ?? s.position[0], s.marker?.[1] ?? s.position[2]),
    }));
  const people = roster.flatMap((person) => {
    const p = remoteStates.get(person.id);
    if (
      person.id === playerId ||
      !p ||
      p.y < -5 !== underground ||
      isMountainPosition(p.x, p.z) ||
      ![p.x, p.z].every(Number.isFinite)
    )
      return [];
    return [
      {
        ...person,
        ...project(p.x, p.z),
        distance: Math.hypot(p.x - playerPos[0], p.z - playerPos[2]),
      },
    ];
  });
  const lotPins =
    showLots && !underground
      ? WARUNG_LOTS.map((lot, i) => ({
          lot: i,
          card: lotCards.find((c) => c.lot === i) ?? null,
          offer: lotMarket?.find((m) => m.lot === i) ?? null,
          ...project(lot.x, lot.z),
        }))
      : [];
  // Quest first, then landmarks, then warungs: earlier entries win label space.
  const labelled = visibleLabels([
    ...pins
      .slice()
      .sort((a, b) => Number(b.icon === "quest") - Number(a.icon === "quest"))
      .map((p) => ({ id: p.id, x: p.x, y: p.y })),
    ...lotPins.filter((l) => l.card).map((l) => ({ id: `lot-${l.lot}`, x: l.x, y: l.y })),
  ]);
  const lotSel = selectedLot === null ? null : (lotPins.find((l) => l.lot === selectedLot) ?? null);
  const me = project(playerPos[0], playerPos[2]);
  const mountain = isMountainPosition(playerPos[0], playerPos[2]);
  const blocked = mountain || (!!dungeon && selected?.id !== "active-quest");
  const navigate = () => {
    if (!selected || blocked) return;
    const game = useGame.getState();
    game.setWaypoint(selected.id === "active-quest" ? null : selected.id);
    game.setGuidanceMuted(false);
    game.setToast(`Petunjuk jalan: ${selected.label}`);
    useHud.getState().setSheet(null);
  };

  return (
    <div className="game-world-map world-map" data-legend-open={legendOpen}>
      {legendOpen && (
        <aside
          id="world-map-locations"
          className="game-map-drawer world-map-drawer"
          aria-label="Legenda peta"
        >
          <Tabs.Root defaultValue="region" className="game-map-tabs">
            <Tabs.List className="game-map-tablist" aria-label="Informasi peta">
              <Tabs.Trigger value="region">Informasi Wilayah</Tabs.Trigger>
              <Tabs.Trigger value="residents">Penduduk</Tabs.Trigger>
              <Tabs.Trigger value="players">Pemain di Sekitar</Tabs.Trigger>
            </Tabs.List>
            <Tabs.Content value="region" className="world-map-tab-content">
              <h3>{underground ? "Cung Underground" : "Jelajahi kota"}</h3>
              <p className="world-map-caption">Pilih lokasi untuk melihat detailnya.</p>
              <div className="world-map-key">
                <span>
                  <i className="world-map-green-dot" /> Pemain
                </span>
                <span>
                  <b>!</b> Quest
                </span>
              </div>
              <nav aria-label="Daftar lokasi">
                {spots.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedId(s.id)}
                    className="world-map-location"
                  >
                    <span className={`world-map-disc ${s.icon === "quest" ? "is-quest" : ""}`}>
                      <MapPoiIcon kind={s.icon} />
                    </span>
                    <span>{s.label}</span>
                    <ChevronRight aria-hidden="true" />
                  </button>
                ))}
              </nav>
            </Tabs.Content>
            <Tabs.Content value="residents" className="world-map-tab-content">
              <h3>Penduduk kota</h3>
              <ul className="world-map-people">
                {populationForQuality(LOW_QUALITY).map((p) => (
                  <li key={p.id}>
                    <span>{p.label}</span>
                  </li>
                ))}
              </ul>
            </Tabs.Content>
            <Tabs.Content value="players" className="world-map-tab-content">
              <h3>Pemain di area ini</h3>
              {!people.length && (
                <p className="world-map-caption">Belum ada pemain lain di area ini.</p>
              )}
              <ul className="world-map-people">
                {people.map((p) => (
                  <li key={p.id}>
                    <i className="world-map-green-dot" />
                    <span>{p.name}</span>
                    <small>{Math.round(p.distance)} m</small>
                  </li>
                ))}
              </ul>
            </Tabs.Content>
          </Tabs.Root>
        </aside>
      )}
      <div
        ref={stage}
        className="game-map-stage world-map-stage"
        onPointerDown={(event) => {
          if (event.button !== 0 || (event.target as HTMLElement).closest("button")) return;
          drag.current = {
            id: event.pointerId,
            x: event.clientX,
            y: event.clientY,
            cx: view.x,
            cz: view.z,
          };
          event.currentTarget.setPointerCapture(event.pointerId);
        }}
        onPointerMove={(event) => {
          const start = drag.current;
          if (!start || start.id !== event.pointerId) return;
          const scale = Math.min(size.width, size.height) / range;
          const bound = underground ? 16 : 180;
          setCenter({
            x: Math.max(-bound, Math.min(bound, start.cx - (event.clientX - start.x) / scale)),
            z: Math.max(-bound, Math.min(bound, start.cz - (event.clientY - start.y) / scale)),
          });
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
      >
        <Minimap
          size={size.width}
          height={size.height}
          range={range}
          centerX={view.x}
          centerZ={view.z}
          follow={false}
          detailed
          terrainOnly
        />
        {pins.map((p) => (
          <button
            key={p.id}
            type="button"
            className={`world-map-pin ${p.icon === "quest" ? "is-quest" : ""}`}
            style={{ left: p.x, top: p.y }}
            aria-label={`Lihat ${p.label}`}
            aria-haspopup="dialog"
            data-active={waypoint === p.id}
            onClick={() => setSelectedId(p.id)}
          >
            <span className="world-map-disc">
              <MapPoiIcon kind={p.icon} />
            </span>
            <span className="world-map-pin-label" data-hidden={!labelled.has(p.id) || undefined}>
              {p.label}
            </span>
          </button>
        ))}
        {lotPins.map((l) => (
          <button
            key={`lot-${l.lot}`}
            type="button"
            className="world-map-lot"
            data-kind={l.card ? "warung" : (l.offer && LOT_TONE[l.offer.status]) || "sale"}
            data-mine={l.offer?.mine || undefined}
            style={{ left: l.x, top: l.y }}
            aria-label={
              l.card ? `Warung ${l.card.name}, kavling ${l.lot + 1}` : `Kavling ${l.lot + 1}`
            }
            aria-haspopup="dialog"
            onClick={() => setSelectedLot(l.lot)}
          >
            <span className="world-map-lot-chip">{l.card ? "🏪" : `#${l.lot + 1}`}</span>
            {l.card && (
              <span
                className="world-map-pin-label"
                data-hidden={!labelled.has(`lot-${l.lot}`) || undefined}
              >
                {l.card.name}
              </span>
            )}
          </button>
        ))}
        {people.map((p) => (
          <span
            key={p.id}
            className="world-map-remote world-map-green-dot"
            style={{ left: p.x, top: p.y }}
            role="img"
            aria-label={`Pemain: ${p.name}`}
            title={p.name}
          />
        ))}
        <span
          className="world-map-self"
          style={{ left: me.x, top: me.y }}
          role="img"
          aria-label="Lokasimu"
        >
          <MapPoiIcon kind="player" />
        </span>
        <button
          type="button"
          className="game-map-legend-toggle"
          aria-label={legendOpen ? "Tutup legenda peta" : "Buka legenda peta"}
          aria-expanded={legendOpen}
          aria-controls="world-map-locations"
          onClick={() => setLegendOpen((open) => !open)}
        >
          {legendOpen ? <ChevronLeft aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
        </button>
        {!underground && (
          <div className="world-map-tools">
            <button
              type="button"
              aria-label="Perbesar peta"
              disabled={zoom >= ZOOMS.length - 1}
              onClick={() => setZoom((z) => Math.min(ZOOMS.length - 1, z + 1))}
            >
              +
            </button>
            <button
              type="button"
              aria-label="Perkecil peta"
              disabled={zoom === 0}
              onClick={() => setZoom((z) => Math.max(0, z - 1))}
            >
              −
            </button>
            <button
              type="button"
              className="world-map-tools-lots"
              aria-pressed={showLots}
              onClick={() => setShowLots((v) => !v)}
            >
              Kavling
            </button>
          </div>
        )}
        <p className="world-map-hint">Geser peta · Ketuk lokasi</p>
      </div>
      {lotSel && (
        <GameModal
          title={`Kavling #${lotSel.lot + 1}${lotSel.offer ? ` · ${lotSel.offer.tierName}` : ""}`}
          className="game-map-poi-sheet"
          onClose={() => setSelectedLot(null)}
          footer={(() => {
            const o = lotSel.offer;
            if (!o) return null;
            if (o.mine) return <p className="world-map-caption">Ini kavling warungmu.</p>;
            const why =
              o.status === "exclusive"
                ? "Kavling eksklusif, tidak dijual."
                : o.status === "soon"
                  ? "Kavling ini akan hadir."
                  : o.unique && o.ownerName
                    ? `Sudah dimiliki ${o.ownerName}.`
                    : null;
            if (why) return <p className="world-map-caption">{why}</p>;
            if (!myWarung)
              return (
                <GameButton
                  onClick={() => {
                    useWarung.setState({ openLot: o.lot });
                    openWarungPanel("home");
                  }}
                >
                  Buka warung di sini · {o.price ? rupiah(o.price) : "Gratis"}
                </GameButton>
              );
            return (
              <>
                <GameButton
                  disabled={warungBusy || myWarung.cash < o.price}
                  onClick={() =>
                    void warungCommand("move_lot", { lot: o.lot }).then(
                      (s) => s && setSelectedLot(null),
                    )
                  }
                >
                  {myWarung.cash < o.price
                    ? `Kas kurang (${rupiah(o.price)})`
                    : `Pindah ke sini · ${o.price ? rupiah(o.price) : "Gratis"}`}
                </GameButton>
                <p className="world-map-caption">
                  Kavling lama dilepas tanpa uang kembali. Butuh level pemain {o.level}.
                </p>
              </>
            );
          })()}
        >
          <p className="world-map-description">
            {lotSel.card
              ? `Sekarang tampil: ${lotSel.card.name} milik ${lotSel.card.ownerName ?? "pemain"} (${lotSel.card.levelName}, ${lotSel.card.online ? "buka" : "dijaga NPC"}).`
              : "Belum ada warung yang tampil di kavling ini di channel ini."}
          </p>
          {lotSel.offer && (
            <p className="world-map-distance">
              {lotSel.offer.price ? rupiah(lotSel.offer.price) : "Gratis"} · Lv.{lotSel.offer.level}
              {lotSel.offer.unique
                ? " · satu pemilik untuk semua channel"
                : ` · ${lotSel.offer.owners} warung berbagi kavling ini`}
            </p>
          )}
        </GameModal>
      )}
      {selected && (
        <GameModal
          title={selected.label}
          className="game-map-poi-sheet"
          onClose={() => setSelectedId(null)}
          footer={
            <>
              <GameButton className="world-map-navigate" disabled={blocked} onClick={navigate}>
                <MapPoiIcon kind="direction" />
                Petunjuk Jalan
              </GameButton>
              {blocked && (
                <p className="world-map-caption">
                  {mountain
                    ? "Kembali ke kota dengan helikopter di basecamp untuk memakai petunjuk kota."
                    : "Petunjuk misi Principal tetap aktif selama misi berlangsung."}
                </p>
              )}
            </>
          }
        >
          <div
            className="world-map-preview"
            role="img"
            aria-label={`Pratinjau lokasi ${selected.label} di peta`}
          >
            <Minimap
              size={600}
              height={210}
              range={34}
              centerX={selected.marker?.[0] ?? selected.position[0]}
              centerZ={selected.marker?.[1] ?? selected.position[2]}
              follow={false}
              detailed
              terrainOnly
            />
            <span className="world-map-preview-symbol">
              <MapPoiIcon kind={selected.icon} />
            </span>
            <span className="world-map-preview-tag">Lokasi di peta</span>
          </div>
          <p className="world-map-description">{selected.detail}</p>
          <p className="world-map-distance">
            {Math.round(
              Math.hypot(selected.position[0] - playerPos[0], selected.position[2] - playerPos[2]),
            )}{" "}
            m dari lokasimu
          </p>
        </GameModal>
      )}
    </div>
  );
}
