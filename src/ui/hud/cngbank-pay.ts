export type PayMethod = "qris" | "transfer" | "va";
export type PayStep = "method" | "qris" | "transfer" | "va" | "pin" | "receipt";

export const PIN_LENGTH = 6;
export const PAY_METHODS: readonly PayMethod[] = ["qris", "transfer", "va"];

/** Steps after choosing a method: its own screen, then PIN, then receipt. */
export const stepsFor = (method: PayMethod): PayStep[] => ["method", method, "pin", "receipt"];

export const nextStep = (method: PayMethod, step: PayStep): PayStep => {
  const steps = stepsFor(method);
  return steps[Math.min(steps.indexOf(step) + 1, steps.length - 1)] ?? "receipt";
};

export const pinComplete = (pin: string) => pin.length >= PIN_LENGTH;

/** Appends a digit, capped at PIN_LENGTH; the PIN is never stored beyond this local string. */
export const pushPin = (pin: string, digit: string) =>
  pinComplete(pin) ? pin : pin + digit.slice(0, 1);

export const isPayMethod = (v: unknown): v is PayMethod => PAY_METHODS.includes(v as PayMethod);
