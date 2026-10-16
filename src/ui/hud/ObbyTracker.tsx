import { useState } from "react";
import { OBBY_PLATFORMS, OBBY_TITLE } from "@/game/obby/model";
import { useObby } from "@/game/obby/store";
import { QuestTrackerCard, QuestTrackerGuidance } from "./QuestTrackerCard";

/** Lives in the existing tracker host, leaving the view and touch controls clear. */
export function ObbyTracker() {
  const status = useObby((s) => s.status);
  const step = useObby((s) => s.step);
  const checkpoint = useObby((s) => s.checkpoint);
  const [expanded, setExpanded] = useState(false);
  if (status !== "active") return null;
  const next = OBBY_PLATFORMS[step + 1];
  const hint =
    next?.kind === "bridge"
      ? "Seberangi jembatan tipis"
      : next?.kind === "moving"
        ? "Tunggu pijakan mendekat, lalu lompat"
        : next?.kind === "checkpoint"
          ? "Mendarat di bendera checkpoint"
          : next?.kind === "finish"
            ? "Lompatan terakhir menuju Finish!"
            : "Ikuti nomor pijakan berikutnya";
  return (
    <QuestTrackerCard
      data-obby-progress
      label="Obby"
      title={OBBY_TITLE}
      count={`${step}/${OBBY_PLATFORMS.length - 1}`}
      summary={hint}
      expanded={expanded}
      onToggle={() => setExpanded(!expanded)}
      toggleLabel="Petunjuk obby"
      progress={{ value: step, max: OBBY_PLATFORMS.length - 1, label: "Progres obby" }}
    >
      <QuestTrackerGuidance>
        {checkpoint ? "Checkpoint tersimpan. " : "Start tersimpan. "}
        Jatuh akan mengembalikanmu ke pijakan aman. Gunakan Spasi atau tombol lompat yang sama.
        Keluar lewat jalur Start untuk berhenti.
      </QuestTrackerGuidance>
    </QuestTrackerCard>
  );
}
