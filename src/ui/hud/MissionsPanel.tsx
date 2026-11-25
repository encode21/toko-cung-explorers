import { useEffect, useState } from "react";
import {
  claimMission,
  loadMissions,
  useWorldMissions,
  type MissionItem,
} from "@/game/world-missions/store";
import { TownEventsJournal } from "@/game/town-events/TownEventsUi";
import "./missions-panel.css";

type Tab = "daily" | "weekly" | "story" | "regulars";
const TABS: { id: Tab; label: string }[] = [
  { id: "daily", label: "Harian" },
  { id: "weekly", label: "Mingguan" },
  { id: "story", label: "Cerita" },
  { id: "regulars", label: "Pelanggan" },
];
const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

function Row({ m }: { m: MissionItem }) {
  const busy = useWorldMissions((s) => s.busy);
  const reward = [m.kas ? rp(m.kas) : "", m.points ? `${m.points} Point` : ""]
    .filter(Boolean)
    .join(" · ");
  return (
    <li
      className="mission-row"
      data-state={m.claimed ? "done" : m.ready ? "ready" : m.locked ? "locked" : "open"}
    >
      <div>
        <strong>{m.locked ? `🔒 ${m.title}` : m.title}</strong>
        <small>
          {Math.min(m.progress, m.target)}/{m.target}
          {reward ? ` · ${reward}` : ""}
        </small>
        <span className="mission-bar" aria-hidden>
          <i style={{ width: `${Math.min(100, (m.progress / Math.max(1, m.target)) * 100)}%` }} />
        </span>
      </div>
      {m.claimed ? (
        <span className="mission-done">✔️</span>
      ) : (
        <button type="button" disabled={!m.ready || busy} onClick={() => void claimMission(m.key)}>
          Ambil
        </button>
      )}
    </li>
  );
}

/** Missions board: daily (per game day), weekly, story lines and quests from warung regulars. */
export function MissionsPanel({ tab: initial = "daily" }: { tab?: Tab }) {
  const [tab, setTab] = useState<Tab>(initial);
  const board = useWorldMissions((s) => s.board);
  const error = useWorldMissions((s) => s.error);
  useEffect(() => {
    void loadMissions();
  }, []);
  if (!board) return <p className="missions-empty">{error || "Memuat misi…"}</p>;
  return (
    <div className="missions-panel">
      <div className="missions-tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "daily" && (
        <>
          <p className="missions-hint">Misi harian berganti tiap hari di game (48 menit).</p>
          <ul>
            {board.daily.map((m) => (
              <Row key={m.key} m={m} />
            ))}
            <Row m={board.dailyBonus} />
          </ul>
        </>
      )}
      {tab === "weekly" && (
        <>
          <p className="missions-hint">Minggu {board.week} · ganti tiap Senin.</p>
          <ul>
            {board.weekly.map((m) => (
              <Row key={m.key} m={m} />
            ))}
          </ul>
        </>
      )}
      {tab === "story" && <TownEventsJournal />}
      {tab === "story" &&
        board.lines.map((l) => (
          <section key={l.key} className="missions-line">
            <h4>{l.title}</h4>
            <p className="missions-hint">{l.blurb}</p>
            <ul>
              {l.steps.map((m) => (
                <Row key={m.key} m={m} />
              ))}
            </ul>
          </section>
        ))}
      {tab === "regulars" &&
        (board.regulars.length ? (
          board.regulars.map((r) => (
            <section key={r.key} className="missions-line">
              <h4>{r.name}</h4>
              <ul>
                {r.steps.map((m) => (
                  <Row key={m.key} m={m} />
                ))}
              </ul>
            </section>
          ))
        ) : (
          <p className="missions-hint">
            Layani pelanggan tetap di warungmu; mereka nanti punya permintaan sendiri.
          </p>
        ))}
    </div>
  );
}
