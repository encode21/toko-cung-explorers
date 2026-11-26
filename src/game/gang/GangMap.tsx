import { useGame } from "@/state/game-store";
import { GameButton } from "@/ui/game-ui/GamePanel";
import { useGang, leaveGang } from "./store";
import { GANG_HALTE_LOCAL, gangName, homeAddress, housePose } from "./model";
import "./gang.css";
export function GangMap({
  size,
  height,
  compact = false,
  overview = false,
}: {
  size?: number;
  height?: number;
  compact?: boolean;
  /** Read-only regional detail shown from the three-location world map. */
  overview?: boolean;
}) {
  const data = useGang((s) => s.data);
  const inside = useGang((s) => s.inside);
  const pos = useGame((s) => s.playerPos);
  const yaw = useGame((s) => s.playerYaw);
  if (!data) return null;
  const length = Math.ceil(data.houses.length / 2) * data.layout.house_spacing + 25;
  const px = (x: number) => 50 + (x / 70) * 100;
  const markerX = (x: number) => Math.max(2, Math.min(98, px(x)));
  const py = (z: number) => ((z + 15) / length) * 100;
  const [halteX, , halteZ] = GANG_HALTE_LOCAL;
  return (
    <div
      className={`gang-map ${compact ? "is-compact" : ""} ${overview ? "is-overview" : ""}`}
      style={{ width: size, height }}
      aria-label={gangName(data)}
      data-kampung-map
    >
      {!compact && !overview && (
        <header>
          <strong>{gangName(data)}</strong>
          {data.home.gang === data.gang && (
            <GameButton onClick={() => useGang.setState({ customize: true })}>
              {data.text["customize"]}
            </GameButton>
          )}
          <GameButton onClick={() => leaveGang()}>{data.text["leave"]}</GameButton>
        </header>
      )}
      <div className="gang-map-plan">
        <div className="gang-map-road" />
        {data.houses.map((house) => {
          const p = housePose(house.number, data.layout);
          return (
            <div
              key={house.number}
              className={`gang-map-house ${house.mine ? "is-mine" : ""} ${house.warung?.open ? "is-open" : ""}`}
              style={{ left: `${px(p.x)}%`, top: `${py(p.z)}%` }}
              title={house.ownerName ?? data.text["empty"]}
            >
              <strong>{house.number}</strong>
              {!compact && (
                <span>
                  {house.ownerName ?? data.text["empty"]}
                  <small>{house.warung?.name}</small>
                </span>
              )}
            </div>
          );
        })}
        {inside === data.gang && (
          <i
            className="gang-map-self"
            style={{
              left: `${markerX(pos[0] - data.layout.origin[0])}%`,
              top: `${py(pos[2] - data.layout.origin[2])}%`,
              transform: `translate(-50%, -50%) rotate(${-yaw + Math.PI}rad)`,
            }}
          />
        )}
        <span
          className="gang-map-halte"
          style={{ left: `${px(halteX)}%`, top: `${py(halteZ)}%` }}
          title="Halte Kampung"
          aria-label="Halte Kampung"
        >
          H
        </span>
        <span className="gang-map-exit">{data.text["gate"]}</span>
      </div>
    </div>
  );
}
