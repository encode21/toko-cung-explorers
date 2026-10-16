import { useEffect, useState } from "react";
import { worldRequest } from "@/services/world/client";
import { connectionId, useChannels } from "@/net/channel-store";
import { useProfile } from "@/identity/profile-store";
import { TIER_COLORS, type FishingSnapshot, type FishTier } from "@/game/fishing/model";
import { QuestTrackerButton } from "./QuestTrackerCard";
import { FishArtwork } from "./FishArtwork";
import "./fishing.css";

export function FishInventory() {
  const account = useProfile((s) => s.profile?.id);
  const room = useChannels((s) => s.lease?.channel);
  const [data, setData] = useState<FishingSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [tier, setTier] = useState<FishTier | "all">("all");
  useEffect(() => {
    let current = true;
    setData(null);
    setError(null);
    if (!account || !room) {
      setError("Masuk ke channel dunia untuk melihat inventory.");
      return;
    }
    void worldRequest<FishingSnapshot>("fishing", { action: "read", room, connectionId })
      .then((snapshot) => {
        if (current) setData(snapshot);
      })
      .catch((e) => {
        if (current) setError(e instanceof Error ? e.message : "Inventory gagal dimuat.");
      });
    return () => {
      current = false;
    };
  }, [account, room, attempt]);
  if (error)
    return (
      <div className="quest-tracker" role="alert">
        <p>{error}</p>
        <QuestTrackerButton onClick={() => setAttempt(attempt + 1)}>Coba lagi</QuestTrackerButton>
      </div>
    );
  if (!data) return <p role="status">Memuat inventory…</p>;
  const count = data.collection.reduce((n, c) => n + c.count, 0);
  return (
    <div className="fish-inventory">
      <p>
        <strong>{count} ekor</strong> tersimpan · {data.collection.length}/{data.fish.length} jenis
        ditemukan
      </p>
      {count === 0 && (
        <p>Belum ada tangkapan. Kunjungi Fishing Spot dan tarik kail saat ikan menyambar!</p>
      )}
      <div className="fish-tier-filters" role="group" aria-label="Kelangkaan ikan">
        {(["all", ...Object.keys(TIER_COLORS)] as (FishTier | "all")[]).map((t) => (
          <button key={t} type="button" aria-pressed={tier === t} onClick={() => setTier(t)}>
            {t === "all" ? "Semua" : t}
          </button>
        ))}
      </div>
      <div className="fishing-grid">
        {data.fish
          .filter((f) => tier === "all" || f.tier === tier)
          .map((f) => {
            const owned = data.collection.find((c) => c.fishId === f.id);
            return (
              <article key={f.id} className={owned ? "is-caught" : ""}>
                <FishArtwork id={f.id} tier={f.tier} />
                <strong>{f.name}</strong>
                <span className="fish-tier" style={{ color: TIER_COLORS[f.tier] }}>
                  {f.tier}
                </span>
                <small>
                  {owned
                    ? `${owned.count} ekor · terbesar ${owned.bestCm.toFixed(1)} cm`
                    : "Belum ditemukan"}
                </small>
              </article>
            );
          })}
      </div>
    </div>
  );
}
