export const NPC_KNOCK_SECONDS = 1.8;
export const NPC_KNOCK_COOLDOWN = 2.5;

/** A small cosmetic shove returns to the safe standing point while the NPC gets up. */
export function npcImpactPose(age: number) {
  if (age < 0 || age >= NPC_KNOCK_SECONDS) return { lift: 0, lean: 0, slide: 0 };
  const recovery = Math.min(1, (NPC_KNOCK_SECONDS - age) / 0.4);
  return {
    lift: Math.max(0, 2.4 * age - 4.9 * age * age),
    lean: -1.45 * Math.min(1, age / 0.45) * recovery,
    slide: 0.7 * Math.min(1, age / 0.45) * recovery,
  };
}
