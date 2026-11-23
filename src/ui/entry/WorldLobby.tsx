import { Link } from "@tanstack/react-router";
import { useEffect } from "react";
import { Home, LogOut } from "lucide-react";
import { useProfile } from "@/identity/profile-store";
import { ChannelSelector } from "@/ui/ChannelSelector";
import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { ActionButton } from "@/ui/adventure/ActionButton";
import { EntryTitleScreen } from "./EntryTitleScreen";

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
  const profileLoading = useProfile((s) => s.loading);

  useEffect(() => {
    if (!profile && !profileLoading && !profileError) void useProfile.getState().load();
  }, [profile, profileLoading, profileError]);

  if (!profile) {
    return (
      <EntryTitleScreen
        embedded
        status={profileError ? undefined : "Menyiapkan profil…"}
        error={profileError || exitError}
      >
        {profileError && !profileLoading && (
          <div className="entry-start-actions">
            <ActionButton
              showIcon={false}
              disabled={loggingOut}
              onClick={() => void useProfile.getState().load()}
            >
              Muat ulang profil
            </ActionButton>
            <ActionButton
              showIcon={false}
              busy={loggingOut}
              busyLabel="Keluar…"
              className="adventure-secondary entry-title-guest"
              onClick={onSignOut}
            >
              Keluar akun
            </ActionButton>
          </div>
        )}
      </EntryTitleScreen>
    );
  }

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
            <ChannelSelector />
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
