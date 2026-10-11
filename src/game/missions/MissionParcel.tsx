/** @jsxImportSource @/game/jsx */
import { useMissions } from "./store";
/** Cosmetic local parcel; no inventory, physics ownership, or player transform changes. */
export function MissionParcel() {
  const carrying = useMissions(
    (s) => !!s.session.active?.carrying && s.session.active.expiresAt > Date.now(),
  );
  if (!carrying) return null;
  return (
    <group name="MissionParcel" position={[0, 1, 0.48]}>
      <mesh>
        <boxGeometry args={[0.42, 0.32, 0.36]} />
        <meshStandardMaterial color="#bda078" />
      </mesh>
      <mesh position={[0, 0.163, 0]}>
        <boxGeometry args={[0.06, 0.006, 0.365]} />
        <meshStandardMaterial color="#e2cda1" />
      </mesh>
    </group>
  );
}
