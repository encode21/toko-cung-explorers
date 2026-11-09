import { VEHICLE_DEFINITIONS } from "@/game/vehicles/definitions";
import { useState } from "react";
import { boardVehicle } from "@/game/vehicles/runtime";
import { Car, Users } from "lucide-react";
import { useMobility, mobilityCommand } from "@/game/mobility/store";
import { vehicleFor, bikeModel } from "@/game/vehicles/model";
import { renderedVehicles, useVehicleInput } from "@/game/vehicles/runtime";
import { connectionId } from "@/net/channel-store";
import { remoteStates } from "@/net/useWorldChannel";
import { useNet } from "@/net/net-store";
import { GameButton } from "@/ui/game-ui/GamePanel";
import "./mobility-hud.css";
import "./vehicle-hud.css";

export function VehicleHud() {
  const state = useMobility();
  const boundaryWarning = useVehicleInput((s) => s.boundaryWarning);
  const roster = useNet((s) => s.roster);
  const [selected, setSelected] = useState("");
  const vehicles = state.vehicles ?? [];
  const invitation = vehicles.find((v) =>
    v.occupants.some((s) => s.connectionId === connectionId && s.status === "pending"),
  );
  const ride = vehicleFor(vehicles, connectionId);
  const v = invitation ?? ride;
  if (!v || state.vehicleLeaving) return null;
  const driver = v.occupants.find((s) => s.seat === 0)?.connectionId;
  const ownDriver = driver === connectionId;
  const phase = v.occupants.find(s=>s.connectionId===connectionId)?.transition?.phase;
  const name = (id: string) => roster.find((r) => r.id === id)?.name ?? "Pemain";
  const pose = renderedVehicles.get(v.id) ?? v.pose;
  const available = roster.filter((r) => {
    const p = remoteStates.get(r.id);
    return (
      r.id !== connectionId &&
      p &&
      !vehicles.some((v) => v.occupants.some((s) => s.connectionId === r.id)) &&
      Math.hypot(p.x - pose.x, p.y - pose.y, p.z - pose.z) < 4
    );
  });
  const target = available.some((r) => r.id === selected) ? selected : available[0]?.id;
  const capacity = VEHICLE_DEFINITIONS[v.model].seats.length;
  const free = v.occupants.length < capacity;
  return (
    <div className="mobility-hud vehicle-hud" data-hud-control>
      <div className="mobility-card" role="status">
        {invitation ? <Users size={18} aria-hidden /> : <Car size={18} aria-hidden />}
        <span>
          {invitation
            ? `${name(driver!)} mengajakmu ${bikeModel(v.model) ? "bonceng" : "ikut"}`
            : phase === "entering" ? "Sedang naik…" : phase === "exiting" ? "Sedang turun…" : ownDriver
              ? `Berkendara · ${v.occupants.filter((s) => s.status === "active").length}/${capacity} kursi`
              : `Menumpang bersama ${name(driver!)}`}
        </span>
        {invitation && (
          <>
            <GameButton
              disabled={state.busy}
              onClick={() => void boardVehicle(v, "vehicle-accept")}
            >
              Terima
            </GameButton>
            <GameButton
              disabled={state.busy}
              onClick={() => void mobilityCommand("vehicle-decline", { vehicleId: v.id })}
            >
              Tolak
            </GameButton>
          </>
        )}
        {ownDriver && target && free && (
          <>
            <select
              aria-label="Pilih penumpang"
              value={target}
              onChange={(e) => setSelected(e.target.value)}
            >
              {available.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            <GameButton
              disabled={state.busy || Math.abs(pose.speed) >= 0.8}
              onClick={() => void mobilityCommand("vehicle-invite", { vehicleId: v.id, target })}
            >
              {bikeModel(v.model) ? "Ajak bonceng" : "Ajak ikut"}
            </GameButton>
          </>
        )}
        {ownDriver && boundaryWarning && phase !== "entering" && phase !== "exiting" && (
          <div className="vehicle-boundary-warning" role="status">
            <strong>Batas area kendaraan · Putar balik</strong>
            <span className="vehicle-boundary-keyboard">Tekan S untuk mundur, lalu belok.</span>
            <span className="vehicle-boundary-touch">
              Lepas GAS, tarik joystick ke belakang untuk mundur.
            </span>
          </div>
        )}
        {ownDriver && <small>W/S gas & mundur · A/D setir · Space rem · F/E turun</small>}
      </div>
    </div>
  );
}
