import { startMobility, useMobility, mobilityCommand } from "@/game/mobility/store";
import { connectionId } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useNet } from "@/net/net-store";
import { remoteStates } from "@/net/useWorldChannel";
import { avatarFromSeed } from "@/identity/avatar";
import { getLocalNetAnim } from "@/net/local-pose";
export async function startMobilityFixture() {
  const qa = window as any;
  qa.mobility = useMobility;
  qa.mobilityCommand = mobilityCommand;
  qa.connectionId = connectionId;
  const name = new URLSearchParams(location.search).get("name") || "Explorer";
  useNet.setState({ name });
  await fetch("/mobility-api/qa/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ connectionId, canFly: new URLSearchParams(location.search).has("gm") }),
  });
  const transport = new BroadcastChannel("mobility-qa");
  transport.onmessage = ({ data }) => {
    remoteStates.set(data.id, data);
    if (!useNet.getState().roster.some((p) => p.id === data.id))
      useNet.setState((s) => ({
        roster: [...s.roster, { id: data.id, name: data.name, avatar: avatarFromSeed(data.id) }],
      }));
  };
  setInterval(() => {
    const g = useGame.getState();
    transport.postMessage({
      id: connectionId,
      name,
      x: g.playerPos[0],
      y: g.playerPos[1],
      z: g.playerPos[2],
      ry: g.playerYaw,
      anim: getLocalNetAnim(),
    });
  }, 100);
  qa.stopMobility = startMobility();
}
