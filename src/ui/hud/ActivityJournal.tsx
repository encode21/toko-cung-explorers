import { useState } from "react";
import { QuestBoard } from "@/ui/quests/QuestBoard";
import { MissionTracker } from "./MissionTracker";
import { DungeonDetails } from "./DungeonHud";
import { ObbyTracker } from "./ObbyTracker";
import { useDungeon } from "@/game/dungeon/store";
import { useObby } from "@/game/obby/store";
import "./context-actions.css";
export function ActivityJournal() {
  const dungeon = useDungeon((s) => !!s.data?.instance);
  const obby = useObby((s) => s.status);
  const [tab, setTab] = useState(dungeon ? "Dungeon" : "Quest");
  return (
    <div className="activity-details">
      <nav role="tablist" aria-label="Detail aktivitas">
        {["Quest", "Misi", "Dungeon", "Obby"].map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
          >
            {t}
          </button>
        ))}
      </nav>
      <div role="tabpanel" aria-label={tab}>
        {tab === "Quest" && (
          <>
            <QuestBoard compact />
          </>
        )}
        {tab === "Misi" && <MissionTracker />}
        {tab === "Dungeon" && <DungeonDetails />}
        {tab === "Obby" &&
          (obby === "active" ? (
            <ObbyTracker />
          ) : (
            <p>Mulai Obby di Proyek Langit. Checkpoint akan tersimpan selama latihan.</p>
          ))}
      </div>
    </div>
  );
}
