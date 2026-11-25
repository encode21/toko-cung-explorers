import type { busPose, useBusRide } from "./bus-ride";
import type { BusServiceCheckpoint } from "./bus-service";

export type BusSnapshot = {
  type: "snapshot";
  peer: string;
  scene: string;
  epoch: string;
  seq: number;
  pose: typeof busPose;
  state: Omit<ReturnType<typeof useBusRide.getState>, "fade" | "riding"> & { riding: boolean };
  service: BusServiceCheckpoint;
};
const object = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object";
const text = (v: unknown, max = 120): v is string => typeof v === "string" && v.length <= max;
const number = (v: unknown, min = -100000, max = 100000): v is number =>
  typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
function stop(v: unknown): boolean {
  return (
    v === null ||
    (object(v) &&
      ["kota", "gerbang", "pasar", "kampung"].includes(v["id"] as string) &&
      text(v["name"]) &&
      object(v["pose"]) &&
      number(v["pose"]["x"]) &&
      number(v["pose"]["z"]) &&
      number(v["yaw"]) &&
      Array.isArray(v["board"]) &&
      v["board"].length === 3 &&
      v["board"].every((n) => number(n)))
  );
}
export function validBusSnapshot(v: unknown): v is BusSnapshot {
  if (
    !object(v) ||
    v["type"] !== "snapshot" ||
    !text(v["peer"]) ||
    !text(v["scene"]) ||
    !text(v["epoch"]) ||
    !Number.isSafeInteger(v["seq"]) ||
    (v["seq"] as number) < 1 ||
    !object(v["pose"]) ||
    !object(v["state"]) ||
    !object(v["service"])
  )
    return false;
  const p = v["pose"],
    s = v["state"],
    c = v["service"];
  return (
    ["x", "z", "yaw", "steer", "wheelAngle", "stopElapsed", "serial"].every((k) =>
      number(p[k], -1e9, 1e9),
    ) &&
    number(p["speed"], 0, 12) &&
    number(p["door"], 0, 1) &&
    ["active", "ready", "compact", "riding"].every((k) => typeof s[k] === "boolean") &&
    text(s["title"]) &&
    ["driving", "boarding", "transfer"].includes(s["phase"] as string) &&
    stop(s["stop"]) &&
    ["waiting", "departureIn", "boarded"].every((k) => number(s[k], 0, 100)) &&
    Array.isArray(s["queues"]) &&
    s["queues"].length <= 4 &&
    s["queues"].every(
      (q) =>
        object(q) &&
        q["stop"] !== null &&
        stop(q["stop"]) &&
        number(q["count"], 0, 10) &&
        typeof q["boarded"] === "boolean",
    ) &&
    text(c["key"]) &&
    number(c["index"], 0, 2) &&
    Number.isInteger(c["index"]) &&
    number(c["distance"], 0, 5000) &&
    text(c["arrivalId"]) &&
    stop(c["stop"]) &&
    (c["window"] === null ||
      (object(c["window"]) &&
        number(c["window"]["arrivalAt"], 0, 1e14) &&
        number(c["window"]["departureAt"], 0, 1e14) &&
        c["window"]["departureAt"] >= c["window"]["arrivalAt"] &&
        c["window"]["departureAt"] - c["window"]["arrivalAt"] <= 30000))
  );
}
