import { useState } from "react";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { useSceneTime } from "@/game/time/scene-time";
import { useNpcConversation } from "@/hooks/use-npc-conversation";
import { cancelKuli, useEasyJobs } from "@/game/easyjobs/store";
import { KULI_DELIVERIES } from "@/game/easyjobs/model";
import { cancelTownEvent, useTownEvents, type TownHost } from "@/game/town-events/store";
import { eventOpen, focusedActivity, hh, townEventStep } from "@/game/town-events/model";
import { trackActivity, useActivityFocus } from "@/game/town-events/focus";
import { QuestTrackerButton, QuestTrackerCard } from "./QuestTrackerCard";
import "./activity-quest-cards.css";

export function ActivityQuestCards({ seconds }: { seconds: number }) {
  const events = useTownEvents((s) => s.events);
  const eventBusy = useTownEvents((s) => s.busy);
  const kuli = useEasyJobs((s) => s.kuli);
  const jobBusy = useEasyJobs((s) => s.busy);
  const selected = useActivityFocus((s) => s.selected);
  const hour = useSceneTime((s) => s.hour);
  const overlay = useGame((s) => s.overlay);
  const muted = useGame((s) => s.guidanceMuted);
  const waypoint = useGame((s) => s.waypoint);
  const sheet = useHud((s) => s.sheet);
  const talking = useNpcConversation();
  const [expanded, setExpanded] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<string | null>(null);
  const [error, setError] = useState("");
  const focus = focusedActivity(events, !!kuli, selected);
  const cards = events
    .filter((e) => e.status === "active")
    .map((e) => ({
      id: `town:${e.host}`,
      title: e.event.title,
      label: e.name,
      step: eventOpen(e.event.hours, hour)
        ? townEventStep(e).label
        : `Mulai ${hh(e.event.hours![0])}`,
      value: e.progress.length,
      max: e.event.points.length,
      detail: `${e.scene === "gang" ? "Gang Kampung" : "Kota"} · hadiah Rp${e.event.reward.toLocaleString("id-ID")}`,
    }));
  if (kuli)
    cards.push({
      id: "kuli",
      title: "Kuli angkut pasar",
      label: "Pekerjaan pasar",
      step: kuli.carrying ? "Antar karung ke kios bertanda" : "Ambil karung di truk",
      value: kuli.done,
      max: KULI_DELIVERIES,
      detail: `Sisa ${seconds} detik · hitung mundur tetap berjalan`,
    });
  const cancelled = cards.find((c) => c.id === confirm);
  cards.sort((a, b) => Number(b.id === focus) - Number(a.id === focus));
  const busy = eventBusy || jobBusy;
  if (!cards.length || overlay !== "none" || sheet || talking) return null;
  return (
    <>
      <aside className="activity-quest-cards" aria-label="Tugas aktif">
        <strong className="activity-quest-heading">Tugas aktif · {cards.length}</strong>
        {cards.map((card) => {
          const tracked = card.id === focus && !muted && !waypoint;
          const open = expanded === card.id;
          return (
            <QuestTrackerCard
              key={card.id}
              data-activity-id={card.id}
              data-tracked={tracked || undefined}
              label={tracked ? "Dilacak" : card.label}
              title={card.title}
              count={`${card.value}/${card.max}`}
              expanded={open}
              onToggle={() => setExpanded(open ? null : card.id)}
              toggleLabel={`Detail ${card.title}`}
              progress={{ value: card.value, max: card.max, label: card.title }}
              footer={
                open && (
                  <>
                    <QuestTrackerButton
                      aria-pressed={tracked}
                      onClick={() => {
                        trackActivity(card.id);
                        setExpanded(null);
                      }}
                    >
                      {tracked ? "Sedang dilacak" : "Lacak"}
                    </QuestTrackerButton>
                    <QuestTrackerButton
                      variant="secondary"
                      disabled={busy}
                      onClick={() => {
                        setError("");
                        setConfirm(card.id);
                      }}
                    >
                      Batalkan
                    </QuestTrackerButton>
                  </>
                )
              }
            >
              <strong>{card.step}</strong>
              <p>{card.detail}</p>
            </QuestTrackerCard>
          );
        })}
      </aside>
      {cancelled && (
        <GameModal
          title="Batalkan tugas?"
          className="game-light"
          onClose={() => {
            if (!busy) setConfirm(null);
          }}
          footer={
            <div className="quest-tracker activity-cancel-actions">
              <QuestTrackerButton
                variant="secondary"
                disabled={busy}
                onClick={() => setConfirm(null)}
              >
                Lanjutkan tugas
              </QuestTrackerButton>
              <QuestTrackerButton
                variant="danger"
                disabled={busy}
                onClick={async () => {
                  const ok =
                    cancelled.id === "kuli"
                      ? await cancelKuli()
                      : await cancelTownEvent(cancelled.id.slice(5) as TownHost);
                  if (ok) setConfirm(null);
                  else setError("Tugas belum bisa dibatalkan. Coba lagi.");
                }}
              >
                Ya, batalkan
              </QuestTrackerButton>
            </div>
          }
        >
          <p>
            <strong>{cancelled.title}</strong>
          </p>
          <p>Progres tugas ini dihapus. Energi yang terpakai tidak dikembalikan.</p>
          {cancelled.id === "kuli" && (
            <p>Upah yang sudah diterima tetap tersimpan. Jeda kerja kuli tetap berlaku.</p>
          )}
          {error && <p role="alert">{error}</p>}
        </GameModal>
      )}
    </>
  );
}
