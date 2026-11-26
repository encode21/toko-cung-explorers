export type IncidentType = "bump-fight" | "parking-fight" | "motorcycle-fall" | "red-light-crash";
export interface Incident {
  id: string;
  type: IncidentType;
  startsAt: number;
  endsAt: number;
  at: [number, number, number];
  location: string;
}
export const INCIDENT_TITLES: Record<IncidentType, string> = {
  "bump-fight": "Senggolan jadi ribut",
  "parking-fight": "Ribut parkir sembarangan",
  "motorcycle-fall": "Pengendara jatuh dari motor",
  "red-light-crash": "Motor menerobos lampu merah",
};
export const liveIncident = (events: Incident[], now: number) =>
  events.find((e) => now >= e.startsAt && now < e.endsAt) ?? null;
export const visibleIncident = (events: Incident[], now: number) =>
  events.find((e) => now >= e.startsAt - 30000 && now < e.endsAt) ?? null;
export const incidentNear = (event: Incident | null, position: readonly number[], radius = 20) =>
  !!event &&
  Math.abs((position[1] ?? 0) - event.at[1]) < 4 &&
  Math.hypot(position[0]! - event.at[0], position[2]! - event.at[2]) <= radius;

type Pose = {
  x: number;
  y: number;
  z: number;
  yaw: number;
  lean: number;
  animation: "Idle" | "Walk" | "Run" | "Talk" | "Hit" | "Fall" | "GetUp" | "RideBike";
};
const mix = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));
const pose = (x: number, z: number, yaw: number, animation: Pose["animation"] = "Idle"): Pose => ({
  x,
  y: 0,
  z,
  yaw,
  lean: 0,
  animation,
});
/** Absolute time, never accumulated frame deltas: late arrivals see the same action. */
export function incidentScene(event: Incident, now: number) {
  const t = (now - event.startsAt) / 1000;
  const traffic = event.type === "motorcycle-fall" || event.type === "red-light-crash";
  const leaving = Math.max(0, t - 100) / 20;
  const a = pose(-1, 0, Math.PI / 2, "Talk");
  const b = pose(1, 0, -Math.PI / 2, "Talk");
  const guard = pose(0, -3, 0, t < 35 ? "Walk" : "Talk");
  guard.z = mix(-9, -3, (t - 20) / 15);
  const motor = pose(0, -10, 0);
  const truck = pose(mix(-16, 1.5, t / 10), -1.6, Math.PI / 2);
  if (traffic) {
    motor.z = mix(-10, -1.6, t / 10);
    motor.lean = t >= 10 && t < 95 ? -1.2 : 0;
    motor.x = mix(0, 3, (t - 12) / 13);
    motor.z = mix(motor.z, -7, (t - 12) / 13);
    a.x = motor.x + (t >= 10 && t < 17 ? 1.1 : 0);
    a.z = motor.z;
    a.y = t < 10 ? 0.45 : 0;
    a.yaw = 0;
    a.animation = t < 10 ? "RideBike" : t < 14 ? "Fall" : t < 17 ? "GetUp" : "Talk";
    b.x = mix(7, 5, (t - 10) / 12);
    b.z = -7;
    b.animation = t < 22 ? "Walk" : "Talk";
    guard.x = 1;
    guard.z -= 5;
    truck.x = mix(truck.x, 10, (t - 12) / 10);
    truck.z = mix(-1.6, -7, (t - 12) / 10);
  } else {
    a.x = mix(-5, -0.65, t / 8);
    b.x = mix(4, 0.65, t / 8);
    a.animation = t < 8 ? "Walk" : t < 10 ? "Hit" : "Talk";
    b.animation = t < 8 ? "Walk" : t < 12 ? "Fall" : t < 15 ? "GetUp" : "Talk";
    motor.x = 0;
    motor.z = 2;
    motor.yaw = Math.PI / 2;
  }
  if (leaving > 0) {
    a.x += leaving * 12;
    b.x -= leaving * 12;
    guard.z -= leaving * 10;
    a.animation = b.animation = guard.animation = "Walk";
    motor.x += leaving * 18;
    motor.lean = 0;
    truck.x += leaving * 25;
  }
  const lines: Record<IncidentType, string[]> = {
    "bump-fight": [
      "Jalan lihat-lihat dong!",
      "Situ juga jangan dorong!",
      "Senggolan doang, kok main pukul?",
      "Sudah! Selesaikan baik-baik.",
      "Iya, maaf. Jangan diulang ya.",
    ],
    "parking-fight": [
      "Motor jangan nutup jalan!",
      "Sebentar doang, Bang!",
      "Sebentar tapi orang nggak bisa lewat!",
      "Jangan main tangan. Geser motornya!",
      "Iya, saya pindahin sekarang.",
    ],
    "motorcycle-fall": [
      "Aduh! Licin banget!",
      "Pelan-pelan, jangan langsung berdiri!",
      "Makanya jangan ngebut, Bang.",
      "Kasih ruang, kita bantu dulu.",
      "Terima kasih, saya lebih hati-hati.",
    ],
    "red-light-crash": [
      "Lampu merah malah diterobos!",
      "Aduh, motor saya!",
      "Truknya sudah lewat, kok nekat!",
      "Mundur dulu, bantu pengendaranya!",
      "Iya, salah saya. Jangan ditiru.",
    ],
  };
  const lineIndex = t < 15 || t >= 100 ? -1 : Math.min(4, Math.floor((t - 15) / 17));
  return {
    a,
    b,
    guard,
    motor,
    truck,
    traffic,
    impact: t >= (traffic ? 10 : 8),
    speaker: lineIndex === 3 ? 2 : lineIndex % 2,
    line: lineIndex < 0 ? null : lines[event.type][lineIndex]!,
    showMotor: traffic || event.type === "parking-fight",
    showTruck: event.type === "red-light-crash",
  };
}
