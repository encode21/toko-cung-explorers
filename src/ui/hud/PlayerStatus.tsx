import { useState } from "react";
import { UserRound } from "lucide-react";
import { useGameCore } from "@/game/core/store";
import { nextLevel } from "@/game/core/types";
import { useProfile } from "@/identity/profile-store";
import { useNet } from "@/net/net-store";
import { useHud } from "@/state/hud-store";
import { AvatarPortrait } from "@/ui/profile/AvatarPortrait";
import { profilePhotoSource } from "@/ui/profile/profile-photos";
import { EnergyBar } from "./EnergyBar";
import "./player-status.css";

/** Compact MMO player frame; detailed progression stays in the profile sheet. */
export function PlayerStatus() {
  const snapshot = useGameCore((s) => s.snapshot);
  const accountProfile = useProfile((s) => s.profile);
  const name = useNet((s) => s.name);
  const toggle = useHud((s) => s.toggleSheet);
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const next = snapshot ? nextLevel(snapshot) : null;
  const profile = snapshot?.profile;
  const photo = profilePhotoSource(accountProfile?.photo);
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
          <span className="mmo-portrait-media">
            {photo && photo !== failedPhoto ? (
              <img src={photo} alt="" onError={() => setFailedPhoto(photo)} />
            ) : accountProfile ? (
              <AvatarPortrait
                avatar={accountProfile.avatar}
                character={accountProfile.equippedCharacter}
                label=""
              />
            ) : (
              <UserRound className="size-4" aria-hidden />
            )}
          </span>
          <span className="mmo-level">{profile?.level ?? 1}</span>
        </span>
        <span className="min-w-0 flex-1 text-left">
          <strong className="mmo-player-name block truncate text-[11px] leading-4">
            {accountProfile?.displayName || name || "Explorer"}
          </strong>
          <span className="mmo-xp-row">
            <span className="mmo-xp-label" aria-hidden="true">
              XP
            </span>
            <progress
              className="mmo-xp"
              aria-label="XP menuju level berikutnya"
              value={profile?.xp ?? 0}
              max={next?.xp ?? Math.max(1, profile?.xp ?? 0)}
            />
          </span>
          <EnergyBar />
        </span>
      </button>
    </div>
  );
}
