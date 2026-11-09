import { startMinigames, miniCommand, useMinigames } from "@/game/minigames/store";
import { startMobility, useMobility, mobilityCommand } from "@/game/mobility/store";
import { connectionId } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useNet } from "@/net/net-store";
import { avatarFromSeed } from "@/identity/avatar";
import { getLocalNetAnim } from "@/net/local-pose";
import { bus } from "./channel";
import { renderedVehicles, useVehicleInput } from "@/game/vehicles/runtime";
export async function startMobilityFixture() {
  const qa = window as any;
  const name = new URLSearchParams(location.search).get("name") || "Explorer";
  const joinedAt = Date.now();
  useNet.setState({ name, roster: [{ id: connectionId, name, avatar: avatarFromSeed(connectionId), joinedAt, available: true }] });
  await fetch("/mobility-api/qa/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ connectionId }) });
  qa.mobility = useMobility; qa.mobilityCommand = mobilityCommand; qa.connectionId = connectionId;
  qa.ridePose = (id: string) => renderedVehicles.get(id);
  qa.vehicleInput = useVehicleInput;
  qa.net = useNet;
  const transport = setInterval(() => {
    const g = useGame.getState();
    bus.postMessage({ event: "state", payload: { id: connectionId, name, joinedAt, x: g.playerPos[0], y: g.playerPos[1], z: g.playerPos[2], ry: g.playerYaw, anim: getLocalNetAnim() } });
  }, 100);
  if (new URLSearchParams(location.search).has("minigames")) {
    qa.minigames=useMinigames; qa.miniCommand=miniCommand; qa.stopMinigames=startMinigames();
  }
  const stop = startMobility();
  qa.stopMobility = () => { stop(); clearInterval(transport); };
}
