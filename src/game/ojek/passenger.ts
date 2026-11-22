/** NPC ojek passengers: personality types and how they react to the riding. Pure, no game imports. */
export interface PassengerType {
  id: "buru" | "penakut" | "cerewet" | "santai";
  label: string;
  /** Hard brake / gas above this many m/s² is "ngawur". */
  accelLimit: number;
  /** Sideways push (yaw rate × speed, m/s²) above this is "ngawur". */
  turnLimit: number;
  /** Riding below slowSpeed m/s for slowSeconds is "kelamaan". */
  slowSpeed: number;
  slowSeconds: number;
  lines: {
    hello: string;
    notReady: string;
    thanks: string;
    reckless: string[];
    slow: string[];
  };
}

export const PASSENGER_TYPES: PassengerType[] = [
  {
    id: "buru",
    label: "Buru-buru",
    accelLimit: 16,
    turnLimit: 20,
    slowSpeed: 6,
    slowSeconds: 4,
    lines: {
      hello: "Bang, ngebut ya, saya telat!",
      notReady: "Eh bentar, belum naik!",
      thanks: "Makasih bang, pas waktunya!",
      reckless: ["Wah, hampir jatuh, tapi gas terus!"],
      slow: [
        "Bang, bisa lebih cepet nggak?",
        "Aduh, telat nih saya!",
        "Kok pelan banget sih bang?",
      ],
    },
  },
  {
    id: "penakut",
    label: "Penakut",
    accelLimit: 11,
    turnLimit: 11,
    slowSpeed: 0,
    slowSeconds: Infinity,
    lines: {
      hello: "Pelan-pelan aja ya bang, saya takut.",
      notReady: "Aduh, jangan jalan dulu!",
      thanks: "Alhamdulillah sampai selamat.",
      reckless: [
        "Astaga! Pelan-pelan bang!",
        "Jangan ngerem mendadak dong!",
        "Belokannya serem banget!",
      ],
      slow: [],
    },
  },
  {
    id: "cerewet",
    label: "Cerewet",
    accelLimit: 12,
    turnLimit: 13,
    slowSpeed: 4,
    slowSeconds: 6,
    lines: {
      hello: "Wah, motornya bagus juga bang.",
      notReady: "Lho, kok udah jalan? Saya belum naik!",
      thanks: "Lumayan lah, bintang empat ya bang.",
      reckless: ["Bang, nyetirnya ngawur ih!", "Hati-hati dong, ini jalan umum!"],
      slow: ["Ini ojek apa becak, bang?", "Ayo bang, kapan sampainya?"],
    },
  },
  {
    id: "santai",
    label: "Santai",
    accelLimit: 18,
    turnLimit: 23,
    slowSpeed: 0,
    slowSeconds: Infinity,
    lines: {
      hello: "Santai aja bang, nggak buru-buru.",
      notReady: "Tunggu bentar ya bang.",
      thanks: "Makasih bang, enak naiknya.",
      reckless: ["Waduh, santai bang, santai."],
      slow: [],
    },
  },
];

export const passengerFor = (orderId: number): PassengerType =>
  PASSENGER_TYPES[
    ((orderId % PASSENGER_TYPES.length) + PASSENGER_TYPES.length) % PASSENGER_TYPES.length
  ]!;

export interface RideFeel {
  lastSpeed: number;
  lastYaw: number;
  slowFor: number;
  /** No remark before this wall-clock ms (avoid nagging every tick). */
  quietUntil: number;
}

/** One 500 ms sample of the ride: returns updated tracking and a remark when the passenger complains. */
export function rideRemark(
  who: PassengerType,
  feel: RideFeel,
  pose: { speed: number; yaw: number },
  nearDestination: boolean,
  now = Date.now(),
  dt = 0.5,
): { feel: RideFeel; text: string | null } {
  const accel = Math.abs(pose.speed - feel.lastSpeed) / dt;
  const dyaw = Math.atan2(Math.sin(pose.yaw - feel.lastYaw), Math.cos(pose.yaw - feel.lastYaw));
  const turn = Math.abs((dyaw / dt) * pose.speed);
  const slow = !nearDestination && Math.abs(pose.speed) < who.slowSpeed;
  const next: RideFeel = {
    lastSpeed: pose.speed,
    lastYaw: pose.yaw,
    slowFor: slow ? feel.slowFor + dt : 0,
    quietUntil: feel.quietUntil,
  };
  if (now < feel.quietUntil) return { feel: next, text: null };
  const pick = (lines: string[]) => lines[Math.floor(now / 1000) % lines.length]!;
  let text: string | null = null;
  if ((accel > who.accelLimit || turn > who.turnLimit) && who.lines.reckless.length)
    text = pick(who.lines.reckless);
  else if (next.slowFor >= who.slowSeconds && who.lines.slow.length) {
    text = pick(who.lines.slow);
    next.slowFor = 0;
  }
  if (text) next.quietUntil = now + 6000;
  return { feel: next, text };
}
