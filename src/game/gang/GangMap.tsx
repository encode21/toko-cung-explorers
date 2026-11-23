import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { GameButton } from "@/ui/game-ui/GamePanel";
import { useGang, leaveGang } from "./store";
import { gangName, homeAddress, housePose } from "./model";
import "./gang.css";

export function GangHomeLink() {
  const data = useGang((s) => s.data);
  if (!data) return null;
  return (
    <div className="gang-home-link">
      <span>
        {data.text["home"]}: {homeAddress(data)}
      </span>
      <GameButton
        onClick={() => {
          useGame.setState({ waypoint: "gang-gate" });
          useHud.getState().setSheet(null);
        }}
      >
        {data.text["go_home"]}
      </GameButton>
    </div>
  );
}
export function GangMap({
  size,
  height,
  compact = false,
}: {
  size?: number;
  height?: number;
  compact?: boolean;
}) {
  const data = useGang((s) => s.data);
  const pos = useGame((s) => s.playerPos);
  if (!data) return null;
  const length = Math.ceil(data.houses.length / 2) * data.layout.house_spacing + 25;
  const px = (x: number) => 50 + (x / 70) * 100;
  const py = (z: number) => ((z + 15) / length) * 100;
  return (
    <div
      className={`gang-map ${compact ? "is-compact" : ""}`}
      style={{ width: size, height }}
      aria-label={gangName(data)}
    >
      {!compact && (
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
        <i
          className="gang-map-self"
          style={{
            left: `${px(pos[0] - data.layout.origin[0])}%`,
            top: `${py(pos[2] - data.layout.origin[2])}%`,
          }}
        />
        <span className="gang-map-exit">{data.text["gate"]}</span>
      </div>
    </div>
  );
}
