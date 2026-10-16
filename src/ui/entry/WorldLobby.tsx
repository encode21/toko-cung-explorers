import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Shield } from "lucide-react";
import { ASSET_CREDITS } from "@/assets/game-assets";
import { useProfile } from "@/identity/profile-store";
import { ChannelSelector } from "@/ui/ChannelSelector";
import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { ActionButton, AdventureSkeleton } from "@/ui/adventure/ActionButton";
import { GameProgress } from "@/ui/hud/GameProgress";

export function WorldLobby({
  onReplayIntro,
  loggingOut,
  exitError,
  onSignOut,
}: {
  onReplayIntro?: () => void;
  loggingOut: boolean;
  exitError: string;
  onSignOut: () => void;
}) {
  const profile = useProfile((s) => s.profile);
  const saving = useProfile((s) => s.saving);
  const profileError = useProfile((s) => s.error);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  return (
    <AdventureShell chapter="Lobby / 02" embedded className="lobby-shell">
      <div className="lobby-grid">
        <section className="adventure-panel lobby-identity">
          <header className="lobby-panel-head">
            <p className="adventure-eyebrow">Identitas penjelajah</p>
          </header>
          <div className="lobby-identity-scroll">
            <div className="lobby-player-row flex items-center gap-3">
              <div className="lobby-player-badge grid place-items-center">
                <Shield aria-hidden />
              </div>
              <div className="min-w-0">
                <p className="text-xs">Selamat datang kembali</p>
                <h1 className="truncate">{profile?.displayName || "Penjelajah"}</h1>
              </div>
            </div>
            {!profile ? (
              <AdventureSkeleton label="Menyiapkan profil…" />
            ) : (
              <>
                <GameProgress compact />
                <button
                  type="button"
                  className="lobby-rename"
                  onClick={() => {
                    setDraft(profile.displayName);
                    setEditing(!editing);
                  }}
                >
                  Ubah nama pemain
                </button>
                {editing && (
                  <form
                    className="my-3 space-y-3"
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (saving) return;
                      const error = await useProfile.getState().save({ displayName: draft.trim() });
                      if (!error) setEditing(false);
                    }}
                  >
                    <label className="block text-sm font-bold">
                      Nama pemain
                      <input
                        required
                        maxLength={18}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="mt-2 min-h-11 w-full px-3"
                      />
                    </label>
                    <ActionButton type="submit" busy={saving} busyLabel="Menyimpan…">
                      Simpan nama
                    </ActionButton>
                  </form>
                )}
              </>
            )}
            {profileError && (
              <p role="alert" className="channel-error mt-2">
                {profileError}
              </p>
            )}
            <p className="lobby-description">
              Pilih channel untuk bertemu pemain lain. Quest, XP, dan koleksimu tetap tersimpan di
              akunmu.
            </p>
            {exitError && (
              <p role="alert" className="channel-error mt-2">
                {exitError}
              </p>
            )}
            <details className="lobby-credits">
              <summary className="cursor-pointer">Kredit dunia</summary>
              {ASSET_CREDITS.map((c) => (
                <p key={c.pack} className="py-2 text-xs">
                  <a href={c.source} target="_blank" rel="noreferrer" className="underline">
                    {c.pack}
                  </a>{" "}
                  · {c.creator} · {c.license}
                </p>
              ))}
            </details>
          </div>
          <div className="lobby-actions">
            {onReplayIntro && (
              <button type="button" className="lobby-text-link" onClick={onReplayIntro}>
                Tonton ulang cerita
              </button>
            )}
            <Link to="/" className="lobby-text-link">
              Menu utama
            </Link>
            <ActionButton
              busy={loggingOut}
              busyLabel="Keluar…"
              className="adventure-secondary"
              onClick={() => onSignOut()}
            >
              Keluar akun
            </ActionButton>
          </div>
        </section>
        <div className="adventure-panel lobby-channels">
          <header className="lobby-panel-head">
            <p className="adventure-eyebrow">02 / Tempat bertemu</p>
          </header>
          <div className="lobby-channels-body">
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
        </div>
      </div>
    </AdventureShell>
  );
}
