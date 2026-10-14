import { UserRound } from "lucide-react";
import { useGameCore } from "@/game/core/store";
import { nextLevel } from "@/game/core/types";
import { useProfile } from "@/identity/profile-store";
import { useNet } from "@/net/net-store";
import { useHud } from "@/state/hud-store";
import { WorldHeader } from "./WorldHeader";

/** Compact MMO player frame; detailed progression stays in the profile sheet. */
export function PlayerStatus() {
  const snapshot = useGameCore((s) => s.snapshot);
  const displayName = useProfile((s) => s.profile?.displayName);
  const name = useNet((s) => s.name);
  const toggle = useHud((s) => s.toggleSheet);
  const next = snapshot ? nextLevel(snapshot) : null;
  const profile = snapshot?.profile;
  return (
    <div className="mmo-player" data-player-status>
      <button
        type="button"
        data-hud-control
        className="mmo-player-frame"
        aria-label="Buka profil dan progression"
        onClick={() => toggle("profile")}
      >
        <span className="mmo-portrait">
          <UserRound className="size-4" aria-hidden />
          <span className="mmo-level">{profile?.level ?? 1}</span>
        </span>
        <span className="min-w-0 flex-1 text-left">
          <strong className="mmo-player-name block truncate text-[11px] leading-4">
            {displayName || name || "Explorer"}
          </strong>
          <span className="mmo-player-title block truncate text-[9px]">
            {profile?.title ?? "Pendatang"}
          </span>
          <progress
            className="mmo-xp"
            aria-label="XP menuju level berikutnya"
            value={profile?.xp ?? 0}
            max={next?.xp ?? Math.max(1, profile?.xp ?? 0)}
          />
        </span>
      </button>
      <WorldHeader />
    </div>
  );
}
