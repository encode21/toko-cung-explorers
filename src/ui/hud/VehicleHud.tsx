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
import { GameChoice } from "@/ui/game-ui/GamePrimitives";
import { useOjek } from "@/game/ojek/store";
import "./mobility-hud.css";
import "./vehicle-hud.css";

export function VehicleHud() {
  const state = useMobility();
  const boundaryWarning = useVehicleInput((s) => s.boundaryWarning);
  const roster = useNet((s) => s.roster);
  const [selected, setSelected] = useState("");
  // NPC ojol passenger on the back seat (client-side only, not a vehicle occupant).
  const ojekOrder = useOjek((s) =>
    s.data?.ojek.order && s.picked === s.data.ojek.order.id ? s.data.ojek.order : null,
  );
  const vehicles = state.vehicles ?? [];
  const invitation = vehicles.find((v) =>
    v.occupants.some((s) => s.connectionId === connectionId && s.status === "pending"),
  );
  const ride = vehicleFor(vehicles, connectionId);
  const v = invitation ?? ride;
  if (!v || state.vehicleLeaving) return null;
  const driver = v.occupants.find((s) => s.seat === 0)?.connectionId;
  const ownDriver = driver === connectionId;
  const phase = v.occupants.find((s) => s.connectionId === connectionId)?.transition?.phase;
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
  const free = v.occupants.length + (ojekOrder ? 1 : 0) < capacity;
  return (
    <>
      {ownDriver && !invitation && phase !== "entering" && phase !== "exiting" && (
        <Speedometer vehicle={v} />
      )}
      <div className="mobility-hud vehicle-hud" data-hud-control>
        <div className="mobility-card" role="status">
          {invitation ? <Users size={18} aria-hidden /> : <Car size={18} aria-hidden />}
          <span>
            {invitation
              ? `${name(driver!)} mengajakmu ${bikeModel(v.model) ? "bonceng" : "ikut"}`
              : phase === "entering"
                ? "Sedang naik…"
                : phase === "exiting"
                  ? "Sedang turun…"
                  : ownDriver && ojekOrder
                    ? `Ojol · antar ke ${ojekOrder.dropoff.name}`
                    : ownDriver
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
              {available.length > 1 && (
                <GameChoice
                  label="Pilih penumpang"
                  options={available.map((r) => ({ value: r.id, label: r.name }))}
                  value={target}
                  onChange={setSelected}
                />
              )}
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
              <span className="vehicle-boundary-touch">Lepas GAS, tahan MUNDUR lalu belok.</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

const TOP_KMH = 36; // advanceRide tops out at 10 m/s
const DIAL_MAX = 40;
const SWEEP = 240; // degrees, -120° (0 km/h) to +120° (DIAL_MAX)
const angle = (kmh: number) => -SWEEP / 2 + (Math.min(kmh, DIAL_MAX) / DIAL_MAX) * SWEEP;
const polar = (deg: number, r: number) => {
  const rad = ((deg - 90) * Math.PI) / 180;
  return [60 + r * Math.cos(rad), 60 + r * Math.sin(rad)] as const;
};
const TICKS = Array.from({ length: DIAL_MAX / 5 + 1 }, (_, i) => i * 5);
const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = polar(angle(from), r);
  const [x2, y2] = polar(angle(to), r);
  return `M${x1} ${y1} A${r} ${r} 0 ${angle(to) - angle(from) > 180 ? 1 : 0} 1 ${x2} ${y2}`;
};

/** Analog dial in the bottom-right corner; needle and km/h are written to the DOM each frame. */
function Speedometer({ vehicle }: { vehicle: RideVehicle }) {
  const needle = useRef<SVGGElement>(null);
  const value = useRef<SVGTextElement>(null);
  useEffect(() => {
    let frame = 0;
    let shown = -1;
    let eased = 0;
    const tick = () => {
      const target = Math.abs(rideTelemetry.speed) * 3.6;
      eased += (target - eased) * 0.25; // a little needle inertia
      const kmh = Math.round(target);
      if (needle.current) needle.current.style.transform = `rotate(${angle(eased)}deg)`;
      if (kmh !== shown && value.current) {
        shown = kmh;
        value.current.textContent = String(kmh);
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
    <>
      <div className="vehicle-gauge" data-hud-control>
        <svg viewBox="0 0 120 120" role="img" aria-label="Speedometer">
          <circle cx="60" cy="60" r="57" fill="#1d2a33" stroke="#fffef5" strokeWidth="3" />
          <circle cx="60" cy="60" r="50" fill="#243845" />
          <path d={arc(0, DIAL_MAX, 46)} stroke="#fffef544" strokeWidth="4" fill="none" />
          <path d={arc(TOP_KMH - 6, DIAL_MAX, 46)} stroke="#ff5a4e" strokeWidth="4" fill="none" />
          {TICKS.map((k) => {
            const major = k % 10 === 0;
            const [x1, y1] = polar(angle(k), 48);
            const [x2, y2] = polar(angle(k), major ? 40 : 43);
            const [tx, ty] = polar(angle(k), 32);
            return (
              <g key={k}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="#fffef5"
                  strokeWidth={major ? 2.4 : 1.4}
                />
                {major && (
                  <text x={tx} y={ty + 3} textAnchor="middle" className="vehicle-gauge-num">
                    {k}
                  </text>
                )}
              </g>
            );
          })}
          <g ref={needle} className="vehicle-gauge-needle">
            <path d="M58.6 62 L60 18 L61.4 62 Z" fill="#ffa415" />
          </g>
          <circle cx="60" cy="60" r="5" fill="#ffa415" stroke="#1d2a33" strokeWidth="2" />
          <text ref={value} x="60" y="88" textAnchor="middle" className="vehicle-gauge-value">
            0
          </text>
          <text x="60" y="99" textAnchor="middle" className="vehicle-gauge-unit">
            km/j
          </text>
        </svg>
      </div>
      <button
        type="button"
        className="vehicle-gauge-horn"
        aria-label="Klakson (H)"
        onClick={() => honk(vehicle)}
      >
        <Megaphone size={22} aria-hidden />
        <span>Klakson · H</span>
      </button>
    </>
  );
}
