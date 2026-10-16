import { useEffect, useState } from "react";
import { Fish as FishIcon } from "lucide-react";
import { GameModal } from "@/ui/game-ui/GamePanel";
import {
  castFishing,
  closeFishing,
  fishingNow,
  reelFishing,
  retryFishing,
  useFishing,
} from "@/game/fishing/store";
import { fishingPhase, TIER_COLORS } from "@/game/fishing/model";
import { QuestTrackerButton, QuestTrackerCard } from "./QuestTrackerCard";
import "./fishing.css";

export function FishingHud() {
  const state = useFishing();
  const [now, setNow] = useState(0);
  const [collection, setCollection] = useState(false);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    if (!state.open) {
      setCollection(false);
      return;
    }
    const timer = setInterval(() => setNow(fishingNow()), 80);
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !collection) closeFishing();
    };
    window.addEventListener("keydown", escape);
    return () => {
      clearInterval(timer);
      window.removeEventListener("keydown", escape);
    };
  }, [state.open, collection]);
  if (!state.open) return null;
  const data = state.data,
    cast = data?.cast ?? null;
  const phase = fishingPhase(cast, now);
  const live = phase === "waiting" || phase === "bite";
  const catchInfo = data?.catch;
  const fish = data?.fish.find((f) => f.id === catchInfo?.fishId);
  const message = state.busy
    ? "Menghubungkan…"
    : phase === "bite"
      ? "Ikan menyambar! Tarik sekarang!"
      : phase === "waiting"
        ? "Kail di air… tunggu pelampung bergerak."
        : phase === "caught" && fish && catchInfo
          ? `${fish.name} · ${catchInfo.tier} · ${catchInfo.sizeCm.toFixed(1)} cm`
          : phase === "missed"
            ? "Ikan lepas. Coba lempar lagi!"
            : "Pilih pancing, lalu lempar kail.";
  return (
    <>
      <QuestTrackerCard
        data-fishing-hud
        className="fishing-hud"
        label="Memancing"
        title="Fishing Spot"
        expanded={expanded}
        onToggle={() => setExpanded(!expanded)}
        error={state.error}
        progress={
          phase === "bite" && cast
            ? {
                value: Math.max(0, cast.expiresAt - now),
                max: cast.expiresAt - cast.biteAt,
                label: "Waktu menarik ikan",
              }
            : undefined
        }
        footer={
          <>
            <p className="fishing-status" role="status" data-fishing-phase={phase}>
              {message}
            </p>
            {!live && !state.pending && data && (
              <label className="fishing-rod">
                Pancing{" "}
                <select
                  aria-label="Pilih pancing"
                  value={state.rodId}
                  disabled={state.busy}
                  onChange={(e) => useFishing.setState({ rodId: e.target.value })}
                >
                  {data.rods
                    .filter((r) => data.ownedRods.includes(r.id))
                    .map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.name}
                      </option>
                    ))}
                </select>
              </label>
            )}
            <div className="fishing-actions">
              <QuestTrackerButton
                disabled={state.busy}
                onClick={() =>
                  void (state.error ? retryFishing() : live ? reelFishing() : castFishing())
                }
              >
                {state.error
                  ? "Coba lagi"
                  : phase === "bite"
                    ? "Tarik ikan!"
                    : phase === "waiting"
                      ? "Tarik kail"
                      : "Lempar kail"}
              </QuestTrackerButton>
              <QuestTrackerButton variant="secondary" onClick={closeFishing}>
                Batal
              </QuestTrackerButton>
            </div>
            {expanded && !live && !state.busy && data && (
              <QuestTrackerButton
                variant="secondary"
                onClick={() => {
                  setCollection(true);
                  useFishing.setState({ browsing: true });
                }}
              >
                Koleksi ikan · {data.collection.reduce((n, c) => n + c.count, 0)}
              </QuestTrackerButton>
            )}
          </>
        }
      >
        <p>Tarik hanya saat ikan menyambar. Bergerak, lompat, atau Batal untuk berhenti.</p>
        <p>{data?.rods.find((r) => r.id === state.rodId)?.detail}</p>
      </QuestTrackerCard>
      {collection && data && (
        <GameModal
          className="fishing-collection"
          title="Koleksi ikan"
          subtitle="Tangkapan tersimpan di akun Toko Cung."
          onClose={() => {
            setCollection(false);
            useFishing.setState({ browsing: false });
          }}
        >
          <p>
            Tier tinggi lebih langka dan tidak dijamin. Kedua pancing memiliki peluang tier yang
            sama.
          </p>
          <div className="fishing-grid">
            {data.fish.map((f) => {
              const owned = data.collection.find((c) => c.fishId === f.id);
              return (
                <article key={f.id} className={owned ? "is-caught" : ""}>
                  <FishIcon aria-hidden style={{ color: TIER_COLORS[f.tier] }} />
                  <strong>{f.name}</strong>
                  <span>{f.tier}</span>
                  <small>
                    {owned
                      ? `${owned.count} ekor · terbesar ${owned.bestCm.toFixed(1)} cm`
                      : "Belum ditemukan"}
                  </small>
                </article>
              );
            })}
          </div>
        </GameModal>
      )}
    </>
  );
}
