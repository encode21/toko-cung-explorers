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
          <div className="lobby-identity-scroll">
            <p className="adventure-eyebrow">Identitas penjelajah</p>
            <div className="lobby-player-row flex items-center gap-4">
              <div className="grid size-16 place-items-center rounded-2xl border border-world-brand/40 bg-world-brand/15">
                <Shield className="size-8 text-world-accent" />
              </div>
              <div>
                <p className="text-xs text-world-muted">Selamat datang kembali</p>
                <h1 className="font-display text-4xl">{profile?.displayName || "Penjelajah"}</h1>
              </div>
            </div>
            {!profile ? (
              <AdventureSkeleton label="Menyiapkan profil…" />
            ) : (
              <>
                <GameProgress compact />
                <button
                  className="mt-5 min-h-11 text-sm text-world-accent underline"
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
                    <label className="block text-sm">
                      Nama pemain
                      <input
                        required
                        maxLength={18}
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        className="mt-2 min-h-12 w-full rounded-lg border px-3"
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
              <p role="alert" className="text-sm text-red-200">
                {profileError}
              </p>
            )}
            <p className="lobby-description text-world-muted">
              Pilih channel untuk bertemu pemain lain. Quest, XP, dan koleksimu tetap tersimpan di
              akunmu.
            </p>
            {exitError && <p role="alert">{exitError}</p>}
            <details className="mt-5 text-xs text-world-muted">
              <summary className="min-h-11 cursor-pointer py-3">Kredit dunia</summary>
              {ASSET_CREDITS.map((c) => (
                <p key={c.pack} className="py-2">
                  <a href={c.source} target="_blank" rel="noreferrer" className="underline">
                    {c.pack}
                  </a>{" "}
                  · {c.creator} · {c.license}
                </p>
              ))}
            </details>
          </div>
          <div className="lobby-actions flex flex-wrap items-center gap-2">
            {onReplayIntro && (
              <button className="min-h-11 py-3 text-sm underline" onClick={onReplayIntro}>
                Tonton ulang cerita
              </button>
            )}
            <Link to="/" className="min-h-11 py-3 text-sm underline">
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
    </AdventureShell>
  );
}
