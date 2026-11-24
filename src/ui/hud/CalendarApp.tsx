import { useEffect } from "react";
import { useWarung, warungCommand } from "@/game/warung/store";
import { RainCalendar } from "./GameCalendar";
import "./warung-panel.css";

/** Phone Kalender: the game calendar (game dates, rain, debts due), separate from Notes. */
export function CalendarApp() {
  const debts = useWarung((s) => s.data?.debts);
  useEffect(() => {
    if (!useWarung.getState().data) void warungCommand("read");
  }, []);
  return (
    <div className="warung-panel">
      <RainCalendar debts={debts ?? []} />
    </div>
  );
}
