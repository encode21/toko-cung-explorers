import type { ActionPosition } from "@/game/interactions/action-projection";

// Local presentation only: no per-frame React state or multiplayer writes.
const positions = new Map<string, [number, number, number]>();

export function setWarungCustomerPosition(id: string, position: ActionPosition) {
  const current = positions.get(id);
  if (current) {
    current[0] = position[0];
    current[1] = position[1];
    current[2] = position[2];
  } else positions.set(id, [...position]);
}

export function removeWarungCustomerPosition(id: string) {
  positions.delete(id);
}

export function warungCustomerPosition(id: string): ActionPosition | null {
  return positions.get(id) ?? null;
}
