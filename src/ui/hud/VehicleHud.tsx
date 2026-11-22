import { VEHICLE_DEFINITIONS } from "@/game/vehicles/definitions";
import { useEffect, useRef, useState } from "react";
import { boardVehicle } from "@/game/vehicles/runtime";
import { Car, Megaphone, Users } from "lucide-react";
import { useMobility, mobilityCommand } from "@/game/mobility/store";
import { vehicleFor, bikeModel } from "@/game/vehicles/model";
import { honk, renderedVehicles, rideTelemetry, useVehicleInput } from "@/game/vehicles/runtime";
import type { RideVehicle } from "@/game/vehicles/model";
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
        {ownDriver && !invitation && phase !== "entering" && phase !== "exiting" && (
          <Speedometer vehicle={v} />
        )}
        {ownDriver && boundaryWarning && phase !== "entering" && phase !== "exiting" && (
          <div className="vehicle-boundary-warning" role="status">
            <strong>Batas area kendaraan · Putar balik</strong>
            <span className="vehicle-boundary-keyboard">Tekan S untuk mundur, lalu belok.</span>
            <span className="vehicle-boundary-touch">
              Lepas GAS, tahan MUNDUR lalu belok.
            </span>
          </div>
        )}
        {ownDriver && (
          <small>W/S gas & mundur · A/D setir · Space rem · F/E turun · H klakson</small>
        )}
      </div>
    </div>
  );
}

const TOP_KMH = 36; // advanceRide tops out at 10 m/s

/** Live km/h written straight to the DOM each frame, so driving does not re-render the HUD. */
function Speedometer({ vehicle }: { vehicle: RideVehicle }) {
  const root = useRef<HTMLDivElement>(null);
  const value = useRef<HTMLElement>(null);
  useEffect(() => {
    let frame = 0;
    let shown = -1;
    const tick = () => {
      const kmh = Math.round(Math.abs(rideTelemetry.speed) * 3.6);
      if (kmh !== shown && value.current && root.current) {
        shown = kmh;
        value.current.textContent = String(kmh);
        root.current.style.setProperty("--speed", String(Math.min(1, kmh / TOP_KMH)));
      }
      frame = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.code !== "KeyH" || e.repeat || t?.closest("input, textarea, select, [contenteditable]"))
        return;
      honk(vehicle);
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [vehicle]);
  return (
    <div ref={root} className="vehicle-speedometer">
      <div className="vehicle-speed-readout" aria-label="Kecepatan">
        <strong ref={value}>0</strong>
        <span>km/j</span>
        <i aria-hidden />
      </div>
      <GameButton aria-label="Klakson" onClick={() => honk(vehicle)}>
        <Megaphone size={18} aria-hidden />
        Klakson
      </GameButton>
    </div>
  );
}
