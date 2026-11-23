import { createFileRoute, notFound } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { drawResultCard, type ShareStats } from "@/game/share/result-card";

const SAMPLES: ShareStats[] = [
  {
    playerName: "Sony",
    playerLevel: 12,
    warungName: "Warung Berkah Jaya",
    warungLevel: 3,
    levelName: "Toko",
    totalSales: 1_350_000,
    kos: { tenants: 4, rooms: 6 },
    ojekTrips: 3,
  },
  {
    playerName: "Explorer",
    playerLevel: 1,
    warungName: "Warung Bu Tini",
    warungLevel: 1,
    levelName: "Warung Teras",
    totalSales: 45_000,
    kos: null,
    ojekTrips: null,
  },
  {
    playerName: "Juragan Kontrakan Paling Kaya Se-Mampang Prapatan",
    playerLevel: 40,
    warungName: "Warung Serba Ada Sumber Rejeki Makmur Sentosa Abadi",
    warungLevel: 5,
    levelName: "Grosir",
    totalSales: 987_654_321,
    kos: { tenants: 12, rooms: 12 },
    ojekTrips: null,
  },
];

function Card({ s }: { s: ShareStats }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    void document.fonts
      .load("700 40px 'Plus Jakarta Sans'")
      .finally(() => drawResultCard(ref.current!, s));
  }, [s]);
  return <canvas ref={ref} style={{ width: 360, height: 450, borderRadius: 12 }} />;
}

export const Route = createFileRoute("/dev/share-card")({
  ssr: false,
  beforeLoad: () => {
    if (!import.meta.env.DEV) throw notFound();
  },
  component: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 16, padding: 16, background: "#555" }}>
      {SAMPLES.map((s) => (
        <Card key={s.warungName} s={s} />
      ))}
    </div>
  ),
});
