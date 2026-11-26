import { useState } from "react";
import { Armchair, DoorOpen, House, Lamp, Sprout, Star, UserRound } from "lucide-react";
import { useGameCore } from "@/game/core/store";
import { useProfile } from "@/identity/profile-store";
import { useGame } from "@/state/game-store";
import { AvatarPortrait } from "@/ui/profile/AvatarPortrait";
import { profilePhotoSource } from "@/ui/profile/profile-photos";
import type { TravelPhase } from "./travel-loader";
import "./home-travel-loader.css";

const stages = {
  cover: { step: 0, label: "Menyiapkan perjalanan…" },
  releasing: { step: 1, label: "Berpindah lokasi…" },
  mounting: { step: 2, label: "Memuat interior…" },
  ready: { step: 3, label: "Menyelesaikan perjalanan…" },
} satisfies Record<TravelPhase, { step: number; label: string }>;

const missionCount = new Intl.NumberFormat("id-ID");

function HomePattern() {
  return (
    <svg className="home-travel-pattern" width="100%" height="100%" aria-hidden="true">
      <defs>
        <pattern id="travel-home-pattern" width="216" height="180" patternUnits="userSpaceOnUse">
          <House x="24" y="24" size={34} />
          <Lamp x="143" y="21" size={36} />
          <Sprout x="90" y="77" size={31} />
          <Armchair x="18" y="125" size={39} />
          <DoorOpen x="153" y="125" size={34} />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill="url(#travel-home-pattern)" />
    </svg>
  );
}

export function HomeTravelLoader({ phase }: { phase: TravelPhase }) {
  const profile = useProfile((s) => s.profile);
  const progressProfile = useGameCore((s) => s.snapshot?.profile);
  const teleportPending = useGame((s) => s.pendingTeleport !== null);
  const [failedPhoto, setFailedPhoto] = useState<string>();
  const photo = profilePhotoSource(profile?.photo);
  const stats = progressProfile?.player_id === profile?.id ? progressProfile : undefined;
  const level = stats?.level ?? profile?.level;
  const bio = profile?.bio.trim();
  const arrived = phase === "ready" && !teleportPending;
  const { step, label } = arrived ? { step: 4, label: "Rumah siap" } : stages[phase];

  return (
    <>
      <HomePattern />
      <div className="home-travel-identity">
        <div className="home-travel-portrait-wrap">
          <div className="home-travel-portrait" aria-hidden="true">
            {photo && photo !== failedPhoto ? (
              <img src={photo} alt="" onError={() => setFailedPhoto(photo)} />
            ) : profile ? (
              <AvatarPortrait avatar={profile.avatar} character={profile.equippedCharacter} />
            ) : (
              <UserRound />
            )}
          </div>
          {level != null && <span className="home-travel-level">Lv. {level}</span>}
        </div>
        <h2>{profile?.displayName || "Rumahmu"}</h2>
        {stats && (
          <div className="home-travel-missions">
            <Star aria-hidden fill="currentColor" strokeWidth={0} />
            <strong>{missionCount.format(stats.missions_completed)}</strong>
            <span>Misi selesai</span>
          </div>
        )}
        {bio && <p className="home-travel-bio">{bio}</p>}
      </div>
      <div className="home-travel-status" role="status" aria-atomic="true">
        {arrived ? <House aria-hidden /> : <span className="home-travel-spinner" aria-hidden />}
        <div>
          <strong>Masuk rumah</strong>
          <span>{label}</span>
        </div>
      </div>
      <div
        className="home-travel-progress"
        role="progressbar"
        aria-label="Tahap masuk rumah"
        aria-valuemin={0}
        aria-valuemax={4}
        aria-valuenow={step}
        aria-valuetext={label}
      >
        <span style={{ width: `${step * 25}%` }} />
      </div>
    </>
  );
}
