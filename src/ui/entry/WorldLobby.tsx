import { Link } from "@tanstack/react-router";
import { Home, LogOut } from "lucide-react";
import { useProfile } from "@/identity/profile-store";
import { ChannelSelector } from "@/ui/ChannelSelector";
import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { ActionButton, AdventureSkeleton } from "@/ui/adventure/ActionButton";

export function WorldLobby({
  loggingOut,
  exitError,
  onSignOut,
}: {
  loggingOut: boolean;
  exitError: string;
  onSignOut: () => void;
}) {
  const profile = useProfile((s) => s.profile);
  const profileError = useProfile((s) => s.error);

  return (
    <AdventureShell chapter="Lobby" embedded className="lobby-shell">
      <div className="lobby-stage">
        <section className="lobby-card" aria-label="Lobby dunia">
          <div className="lobby-channels-body">
            {(profileError || exitError) && (
              <div className="lobby-alerts">
                {profileError && (
                  <p role="alert" className="channel-error">
                    {profileError}
                  </p>
                )}
                {exitError && (
                  <p role="alert" className="channel-error">
                    {exitError}
                  </p>
                )}
              </div>
            )}
            {profile ? (
              <ChannelSelector />
            ) : (
              <>
                <AdventureSkeleton label="Menyiapkan profil…" />
                <ActionButton onClick={() => void useProfile.getState().load()}>
                  Muat ulang profil
                </ActionButton>
              </>
            )}
          </div>
        </section>

        <nav className="lobby-side-actions" aria-label="Aksi lobby">
          <Link to="/" className="lobby-circle-button lobby-circle-home" aria-label="Menu utama">
            <Home aria-hidden />
          </Link>
          <button
            type="button"
            className="lobby-circle-button lobby-circle-signout"
            aria-label={loggingOut ? "Keluar…" : "Keluar akun"}
            disabled={loggingOut}
            onClick={() => onSignOut()}
          >
            <LogOut aria-hidden />
          </button>
        </nav>
      </div>
    </AdventureShell>
  );
}
