import { VENUE_DESTINATIONS } from "@/game/club/venue-layout";
import { SHELVES } from "@/game/world/layout";
import { PLACES } from "@/game/world/places";
import { useHud } from "@/state/hud-store";
import { useGame } from "@/state/game-store";
import "./explore-panel.css";

/** Compass / waypoint mark — filled, optical center in viewBox. */
function ExplorePinIcon() {
  return (
    <svg viewBox="0 0 32 32" width="22" height="22" aria-hidden="true">
      <path
        d="M16 3c-5.5 0-10 4.3-10 9.6 0 6.6 8.2 14.6 9.4 15.7a.9.9 0 0 0 1.2 0C17.8 27.2 26 19.2 26 12.6 26 7.3 21.5 3 16 3Z"
        fill="#39bedc"
        stroke="#1f7a8c"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="12.5" r="4.2" fill="#fff8e8" stroke="#1f7a8c" strokeWidth="1.4" />
      <circle cx="16" cy="12.5" r="1.8" fill="#f0a14a" />
    </svg>
  );
}

/** Explore destinations — teal Play Together panel (distinct from feed orange / mission blue). */
export function ExplorePanel() {
  const setWaypoint = useGame((s) => s.setWaypoint);
  const waypoint = useGame((s) => s.waypoint);
  const setSheet = useHud((s) => s.setSheet);
  const destinations = [...VENUE_DESTINATIONS, ...SHELVES];

  return (
    <div className="explore-panel" data-explore-panel>
      <div className="explore-panel-intro">
        <p>Jelajahi area toko — panah penunjuk arah akan memandumu.</p>
      </div>

      <div className="explore-panel-grid">
        {destinations.map((spot) => {
          const active = waypoint === spot.id;
          return (
            <button
              key={spot.id}
              type="button"
              className={`explore-dest${active ? " is-active" : ""}`}
              aria-pressed={active}
              onClick={() => {
                setWaypoint(spot.id);
                setSheet(null);
              }}
            >
              <span className="explore-dest-icon">
                <ExplorePinIcon />
              </span>
              <span className="explore-dest-copy">
                <span className="explore-dest-title">{spot.label}</span>
                <span className="explore-dest-meta">Area eksplorasi</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="explore-nearby">
        <h3>Di sekitar toko</h3>
        <ul className="explore-nearby-list">
          {PLACES.map((place) => (
            <li key={place.id}>
              <span className={`explore-place-chip tone-${place.tone}`}>{place.name}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
