import { useTouchControls } from "@/hooks/use-touch";
import { useEffect, useRef, useState } from "react";
import { closeFishing, fishingAction, useFishing } from "@/game/fishing/store";
import { useFishingPhase } from "@/game/fishing/use-fishing-phase";
import { TIER_COLORS } from "@/game/fishing/model";
import { useHud } from "@/state/hud-store";
import { QuestTrackerButton, QuestTrackerCard } from "./QuestTrackerCard";
import { FishArtwork } from "./FishArtwork";
import "./fishing.css";

export function FishingHud() {
  const state = useFishing();
  const touch = useTouchControls();
  const { now, phase, revealing } = useFishingPhase();
  const [expanded, setExpanded] = useState(false);
  const lastBite = useRef("");
  const catchCard = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.revealStarted !== null) catchCard.current?.parentElement?.scrollTo({ top: 0 });
  }, [state.revealStarted]);
  useEffect(() => {
    if (!state.open) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeFishing();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [state.open]);
  useEffect(() => {
    if (state.open && phase === "bite" && state.data?.cast?.id !== lastBite.current) {
      lastBite.current = state.data?.cast?.id ?? "";
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        navigator.vibrate?.([80, 50, 100]);
    }
  }, [state.open, phase, state.data?.cast?.id]);
  if (!state.open) return null;
  const data = state.data,
    cast = data?.cast ?? null;
  const live = phase === "waiting" || phase === "bite";
  const catchInfo = data?.catch;
  const fish = data?.fish.find((f) => f.id === catchInfo?.fishId);
  const reeling = state.busy && state.pending?.action === "reel";
  const message = reeling
    ? "Menarik tali…"
    : state.busy
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
  const caught = phase === "caught" && fish && catchInfo;
  const openInventory = () => {
    closeFishing();
    useHud.getState().setSheet("inventory");
  };
  return (
    <>
      {!(touch && caught) && (
        <QuestTrackerCard
          data-fishing-active={((live || reeling) && !state.error) || undefined}
          data-fishing-hud
          className="fishing-hud"
          label="Memancing"
          title="Fishing Spot"
          expanded={expanded}
          onToggle={() => setExpanded(!expanded)}
          error={state.error}
          progress={
            phase === "bite" && cast && !state.busy
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
              {!live && !state.pending && !revealing && data && (
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
                  disabled={state.busy || revealing}
                  onClick={() => void fishingAction()}
                >
                  {state.error
                    ? "Coba lagi"
                    : revealing
                      ? "Dapat ikan!"
                      : reeling
                        ? "Menarik…"
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
              {!live && !state.busy && !revealing && data && (
                <QuestTrackerButton variant="secondary" onClick={openInventory}>
                  Koleksi ikan · {data.collection.reduce((n, c) => n + c.count, 0)}
                </QuestTrackerButton>
              )}
            </>
          }
        >
          <p>
            Tarik saat ikan menyambar dengan tombol kail atau Spasi. Bergerak atau Batal untuk
            berhenti.
          </p>
          <p>{data?.rods.find((r) => r.id === state.rodId)?.detail}</p>
        </QuestTrackerCard>
      )}
      {caught && (
        <div
          ref={catchCard}
          className={`quest-tracker fishing-catch${touch ? " fishing-catch-touch" : ""}`}
          key={cast?.id}
          data-fishing-phase="caught"
          data-fishing-catch
          data-revealing={revealing}
          role="status"
        >
          <div className="fishing-catch-summary">
            <FishArtwork id={fish.id} tier={fish.tier} />
            <div className="fishing-catch-details">
              <span className="fish-tier" style={{ color: TIER_COLORS[fish.tier] }}>
                {fish.tier}
              </span>
              <strong>{fish.name}</strong>
              <small>
                {catchInfo.sizeCm.toFixed(1)} cm ·{" "}
                {revealing ? "Berhasil ditangkap!" : "✓ Masuk inventory"}
              </small>
            </div>
          </div>
          {touch && (
            <div className="fishing-actions">
              <QuestTrackerButton disabled={revealing} onClick={openInventory}>
                Koleksi ikan · {data!.collection.reduce((n, c) => n + c.count, 0)}
              </QuestTrackerButton>
              <QuestTrackerButton variant="secondary" onClick={closeFishing}>
                Batal
              </QuestTrackerButton>
            </div>
          )}
        </div>
      )}
    </>
  );
}
