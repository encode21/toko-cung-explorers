import { useEffect, useState } from "react";
import { useMissions } from "@/game/missions/store";
import { DEFINITIONS } from "@/game/missions/model";
import { requestMission } from "@/game/missions/runtime";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";
import { useHud } from "@/state/hud-store";
import { useTouchDrive } from "@/game/player/touch-drive";
import { QuestTrackerButton, QuestTrackerCard, QuestTrackerGuidance } from "./QuestTrackerCard";

/** Optional mission region; no overlay or keyboard-only mission controls. */
export function MissionTracker() {
  const { session, available, pending, ready, error } = useMissions();
  const [confirmCancel, setConfirmCancel] = useState(false);
  const expanded = useHud((s) => s.tracker === "mission");
  const toggleTracker = useHud((s) => s.toggleTracker);
  const { touch } = useMobileHudLayout();
  const moving = useTouchDrive((s) => s.active);
  const active = session.active;

  useEffect(() => {
    if (!touch || !moving || !expanded) return;
    useHud.setState({ tracker: null });
  }, [touch, moving, expanded]);

  if (!active && !available.length && !error) return null;

  return (
    <QuestTrackerCard
      aria-label="Misi opsional"
      label="Misi"
      title={active ? DEFINITIONS[active.type].title : "Bantuan opsional"}
      summary={
        active
          ? active.carrying
            ? "Bawa paket ke meja packing"
            : DEFINITIONS[active.type].objective
          : `${available.length} misi tersedia`
      }
      count={active ? `${active.progress} / ${DEFINITIONS[active.type].target}` : undefined}
      expanded={expanded}
      onToggle={() => toggleTracker("mission")}
      toggleLabel={expanded ? "Ciutkan misi" : "Buka misi opsional"}
      progress={
        active
          ? {
              value: active.progress,
              max: DEFINITIONS[active.type].target,
              label: "Progres misi opsional",
            }
          : undefined
      }
      error={error}
      errorRole="status"
      footer={
        !ready && expanded ? (
          <p className="quest-tracker-hint">Menunggu koneksi dunia…</p>
        ) : undefined
      }
    >
      {active ? (
        <>
          <p className="quest-tracker-current">
            {active.carrying ? "Bawa paket ke meja packing" : DEFINITIONS[active.type].objective}
          </p>
          <QuestTrackerGuidance>
            {active.type === "STORE_RUSH_HELP_CASHIER"
              ? "Dekati sisi depan kasir"
              : active.carrying
                ? "Meja packing di tengah gudang"
                : "Ambil paket dari tumpukan kiri gudang"}
          </QuestTrackerGuidance>
          {active.sourceEndedAt !== null && (
            <p className="quest-tracker-hint">
              Event selesai · waktu tambahan untuk menuntaskan misi.
            </p>
          )}
          {confirmCancel ? (
            <div className="quest-tracker-confirm">
              <p>Batalkan misi ini?</p>
              <div className="quest-tracker-actions">
                <QuestTrackerButton
                  variant="danger"
                  disabled={pending}
                  onClick={() => {
                    requestMission("cancel");
                    setConfirmCancel(false);
                  }}
                >
                  Ya, batalkan
                </QuestTrackerButton>
                <QuestTrackerButton variant="secondary" onClick={() => setConfirmCancel(false)}>
                  Lanjutkan misi
                </QuestTrackerButton>
              </div>
            </div>
          ) : (
            <div className="quest-tracker-actions">
              <QuestTrackerButton variant="secondary" onClick={() => setConfirmCancel(true)}>
                Batalkan Misi
              </QuestTrackerButton>
            </div>
          )}
          {pending && <p role="status">Memproses…</p>}
          {!!available.length && (
            <p className="quest-tracker-hint">
              {available.map((o) => DEFINITIONS[o.type].title).join(" · ")} tersedia. Tuntaskan misi
              aktif terlebih dahulu.
            </p>
          )}
        </>
      ) : (
        <>
          <p className="quest-tracker-hint">Bantuan opsional · Kontribusi +1</p>
          <div className="quest-tracker-list">
            {available.map((offer) => (
              <div key={offer.sourceEventId} className="quest-tracker-list-item">
                <div>
                  <strong>{DEFINITIONS[offer.type].title}</strong>
                  <small>
                    {offer.type === "STORE_RUSH_HELP_CASHIER"
                      ? "Toko ramai · proses 5 item"
                      : "Gudang sibuk · antar 3 paket"}
                  </small>
                </div>
                <QuestTrackerButton
                  disabled={pending || !ready}
                  onClick={() => {
                    setConfirmCancel(false);
                    requestMission("accept", offer.sourceEventId);
                  }}
                  aria-label={`Ambil Misi ${DEFINITIONS[offer.type].title}`}
                >
                  Ambil Misi
                </QuestTrackerButton>
              </div>
            ))}
          </div>
        </>
      )}
    </QuestTrackerCard>
  );
}
