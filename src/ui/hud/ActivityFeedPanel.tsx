import { useHud } from "@/state/hud-store";
import "./feed-panel.css";

/** Filled bell — artwork centered in the viewBox so it sits in the middle of the badge. */
function ActivityBellIcon() {
  return (
    <svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true">
      <path
        d="M17.5 9.2V7.4a2.5 2.5 0 0 1 5 0v1.8"
        fill="none"
        stroke="#b6804e"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M20 10c-5.8 0-10.5 4.4-10.5 9.8 0 4.2-.9 7.8-3.8 10.5-.5.5-.2 1.4.6 1.4h27.4c.8 0 1.1-.9.6-1.4-2.9-2.7-3.8-6.3-3.8-10.5C30.5 14.4 25.8 10 20 10Z"
        fill="#ffd46d"
        stroke="#b6804e"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M16.2 15c1.2-2.6 3.2-4 5.6-4.4"
        fill="none"
        stroke="#fff0b3"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.8 33.5a3.4 3.4 0 0 0 6.4 0"
        fill="#e99b61"
        stroke="#a77448"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="29.5" cy="12.5" r="4.6" fill="#ff8091" stroke="#fff7e3" strokeWidth="1.8" />
      <path
        d="M29.5 10.2v2.1m0 2.2v.1"
        stroke="#fff8e9"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </svg>
  );
}

function ActivityEmptyIcon() {
  return (
    <svg viewBox="0 0 48 48" width="40" height="40" aria-hidden="true">
      <circle cx="24" cy="24" r="18" fill="#fff1bf" stroke="#e0c56a" strokeWidth="2" />
      <path
        d="M24 14v12l7 4"
        fill="none"
        stroke="#846018"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** World activity list — warm Play Together palette (not Daily Mission blue). */
export function ActivityFeedPanel() {
  const events = useHud((s) => s.events);
  const activity = events.filter((event) => event.tone === "npc").slice(0, 20);

  return (
    <div className="activity-feed-panel" data-activity-feed>
      <div className="activity-feed-summary">
        <span className="activity-feed-summary-icon" aria-hidden="true">
          <ActivityBellIcon />
        </span>
        <div>
          <span>Aktivitas NPC sesi ini</span>
          <strong>{activity.length}</strong>
          <small>Update langsung dari dunia</small>
        </div>
      </div>
      {!activity.length ? (
        <div className="activity-feed-empty" role="status">
          <ActivityEmptyIcon />
          <p>Belum ada aktivitas NPC yang tercatat di sesi ini.</p>
        </div>
      ) : (
        <ul className="activity-feed-list" aria-label="Daftar aktivitas dunia">
          {activity.map((event) => (
            <li key={event.id} className="activity-feed-item">
              <time dateTime={new Date(event.at).toISOString()}>
                {new Date(event.at).toLocaleTimeString("id-ID", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
              <p>{event.text}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
