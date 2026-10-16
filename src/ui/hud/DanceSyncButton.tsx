import { useRef, useState } from "react";
import { clubCommand, clubNow, useClub } from "@/game/club/store";
import { connectionId } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import { useGame } from "@/state/game-store";

/** Lives in the player's existing overhead action row, alongside Sapa. */
export function DanceSyncButton({ playerId, name }: { playerId: string; name: string }) {
  const club = useClub();
  const connected = useNet((s) => s.connected);
  const [pending, setPending] = useState(false);
  const sending = useRef(false);
  const member = club.data?.members[playerId];
  if (!club.inside || playerId === connectionId || !member?.dance || member.expiresAt <= clubNow())
    return null;

  const sync = async () => {
    const latest = useClub.getState();
    const target = latest.data?.members[playerId];
    const nearby = useGame.getState().nearby;
    if (
      sending.current ||
      latest.busy ||
      !latest.inside ||
      !useNet.getState().connected ||
      playerId === connectionId ||
      !target?.dance ||
      target.expiresAt <= clubNow() ||
      nearby?.kind !== "player" ||
      nearby.id !== playerId
    )
      return;
    sending.current = true;
    setPending(true);
    try {
      await clubCommand("sync", { target: playerId });
    } finally {
      sending.current = false;
      setPending(false);
    }
  };

  return (
    <button
      type="button"
      className="world-action-button"
      data-hud-control
      data-dance-sync={playerId}
      aria-label={`Sync dance · ${name}`}
      title={`Sync dance · ${name}`}
      disabled={club.busy || pending || !connected}
      onClick={() => void sync()}
    >
      <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
        <path
          fill="currentColor"
          d="M25 9.5A11 11 0 0 0 7 7L4 4v9h9L9.5 9.5A7.5 7.5 0 0 1 22 11Zm-18 13A11 11 0 0 0 25 25l3 3v-9h-9l3.5 3.5A7.5 7.5 0 0 1 10 21Z"
        />
        <circle cx="16" cy="12" r="2.5" fill="currentColor" />
        <path
          d="m11.5 15 4.5 2 4.5-2M16 17v4m0-1-3 4m3-4 3 4"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </button>
  );
}
