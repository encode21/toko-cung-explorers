import { GameModal } from "@/ui/game-ui/GamePanel";
import { useEffect, useState } from "react";
import { formatMissionTime, useQuestCompletion } from "@/game/core/completion-store";
import { ActionButton } from "@/ui/adventure/ActionButton";

/** GTA-style mission passed: time, XP, and points after quest complete. */
export function QuestCompleteOverlay() {
  const result = useQuestCompletion((s) => s.result);
  const dismiss = useQuestCompletion((s) => s.dismiss);
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    if (!result) {
      setPhase(0);
      return;
    }
    setPhase(0);
    const timers = [120, 420, 720, 1020].map((ms, i) =>
      window.setTimeout(() => setPhase(i + 1), ms),
    );
    return () => timers.forEach(clearTimeout);
  }, [result]);

  if (!result) return null;

  const totalXp = result.xpAwarded + result.clueXp;
  const principal = result.theme === "principal-dungeon";
  const eyebrow =
    result.theme === "rahasia-dunia"
      ? "Chapter cleared"
      : principal
        ? "Respect +"
        : "Mission passed";
  const headline = principal
    ? "MISSION PASSED"
    : result.theme === "rahasia-dunia"
      ? "QUEST SELESAI"
      : "QUEST SELESAI";
  const rows = [
    { label: "Waktu", value: formatMissionTime(result.durationSeconds) },
    {
      label: "XP",
      value:
        result.clueXp > 0
          ? `+${totalXp}  (jejak ${result.clueXp} + chapter ${result.xpAwarded})`
          : `+${result.xpAwarded}`,
    },
    { label: "Point", value: `+${result.pointAwarded}` },
  ];

  return (
    <GameModal
      title="Quest selesai"
      onClose={dismiss}
      footer={<ActionButton onClick={dismiss}>Lanjut jelajah</ActionButton>}
    >
      <div className="flex flex-col items-center text-center">
        <p
          className={`text-[11px] font-semibold uppercase tracking-[0.45em] transition-opacity duration-500 ${
            principal ? "text-[#7CFF7C]" : "text-amber-200/90"
          } ${phase >= 1 ? "opacity-100" : "opacity-0"}`}
        >
          {eyebrow}
        </p>
        <h2
          id="quest-complete-title"
          className={`mt-2 font-display tracking-wide transition-all duration-500 ${
            principal
              ? "text-5xl text-[#7CFF7C] drop-shadow-[0_3px_0_#0a3d0a] sm:text-7xl"
              : "text-5xl text-[#f6e7c1] drop-shadow-[0_2px_0_#3a2010] sm:text-6xl"
          } ${phase >= 1 ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0"}`}
        >
          {headline}
        </h2>
        <p
          className={`mt-2 max-w-md text-sm text-[#fff8ef]/80 transition-opacity duration-500 ${
            phase >= 2 ? "opacity-100" : "opacity-0"
          }`}
        >
          {result.title}
        </p>
        <dl
          className={`mt-3 w-full max-w-sm space-y-2 text-left transition-opacity duration-500 ${
            phase >= 3 ? "opacity-100" : "opacity-0"
          }`}
        >
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 border-b border-white/15 pb-2"
            >
              <dt className="text-[11px] font-semibold uppercase tracking-[0.22em] text-amber-200/80">
                {row.label}
              </dt>
              <dd className="font-display text-2xl tracking-wide text-[#fff8ef]">{row.value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </GameModal>
  );
}
