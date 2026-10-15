import { lazy, Suspense, useEffect, useState } from "react";
import { House, Pencil, Radio, Shirt, Star, Trophy } from "lucide-react";
import { useGameCore } from "@/game/core/store";
import { DAILY_POINT_CAP, nextLevel } from "@/game/core/types";
import { useProfile, type PlayerProfile } from "@/identity/profile-store";
import { ROLES, roleById } from "@/identity/roles";
import { leaveChannel, useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { AdventureSkeleton } from "@/ui/adventure/ActionButton";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import { AvatarPortrait } from "./AvatarPortrait";
import { CharacterDesigner } from "./CharacterDesigner";
import "./profile-panel.css";

const AvatarPreview = lazy(() => import("@/game/avatar/AvatarPreview"));
const number = (value: number) => value.toLocaleString("id-ID");

function ProfileEditor({ profile, onClose }: { profile: PlayerProfile; onClose: () => void }) {
  const saving = useProfile((s) => s.saving);
  const save = useProfile((s) => s.save);
  const [error, setError] = useState<string | null>(null);
  // Snapshot on open: background refreshes must not replace an unfinished edit.
  const [draft, setDraft] = useState(() => ({
    displayName: profile.displayName,
    username: profile.username,
    bio: profile.bio,
    role: profile.role,
  }));
  const persist = async () => {
    if (saving) return;
    const result = await save({ ...draft, displayName: draft.displayName.trim() });
    setError(result);
    if (!result) {
      useGame.getState().setToast("Profil tersimpan");
      onClose();
    }
  };
  return (
    <GameModal
      title="Edit profil"
      className="profile-edit-modal"
      bodyClassName="profile-edit-body"
      onClose={() => {
        if (!saving) onClose();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void persist();
        }}
      >
        <fieldset disabled={saving}>
          <div className="profile-edit-identity">
            <div className="profile-avatar">
              <AvatarPortrait avatar={profile.avatar} character={profile.equippedCharacter} />
            </div>
            <div className="profile-edit-fields">
              <label>
                Nama tampilan <Pencil aria-hidden />
                <input
                  required
                  value={draft.displayName}
                  maxLength={18}
                  onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                />
              </label>
              <label>
                Username
                <input
                  value={draft.username}
                  maxLength={24}
                  placeholder="username_unik"
                  onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                />
              </label>
            </div>
          </div>
          <label className="profile-bio-field">
            Perkenalkan dirimu
            <textarea
              aria-label="Bio"
              value={draft.bio}
              maxLength={140}
              placeholder="Ceritakan sedikit tentang dirimu…"
              onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
            />
            <span>
              {draft.bio.length}/140 <Pencil aria-hidden />
            </span>
          </label>
          <div className="profile-role-picker" role="group" aria-label="Peran pemain">
            <p>Peran · {roleById(draft.role).name}</p>
            <div>
              {ROLES.filter((r) => r.selfSelectable).map((r) => (
                <button
                  type="button"
                  key={r.id}
                  aria-pressed={draft.role === r.id}
                  onClick={() => setDraft({ ...draft, role: r.id })}
                >
                  {r.icon} {r.name}
                </button>
              ))}
            </div>
          </div>
          {error && (
            <p className="profile-error" role="alert">
              {error}
            </p>
          )}
          <div className="profile-edit-actions">
            <button type="button" className="profile-pill" onClick={onClose}>
              Batal edit
            </button>
            <button
              type="submit"
              className="profile-pill profile-primary"
              disabled={!draft.displayName.trim()}
            >
              {saving ? "Menyimpan…" : "Simpan profil"}
            </button>
          </div>
        </fieldset>
      </form>
    </GameModal>
  );
}

export function ProfilePanel() {
  const snapshot = useGameCore((s) => s.snapshot);
  const profile = useProfile((s) => s.profile);
  const error = useProfile((s) => s.error);
  const load = useProfile((s) => s.load);
  const setSheet = useHud((s) => s.setSheet);
  const channel = useChannels((s) => s.lease?.channel);
  const channelBusy = useChannels((s) => s.busy);
  const [mode, setMode] = useState<"profile" | "designer">("profile");
  const [tab, setTab] = useState<"home" | "achievements">("home");
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    void load();
  }, [load]);

  if (!profile)
    return (
      <div className="profile-loading">
        {error ? (
          <div role="alert">
            {error}
            <button className="profile-pill" onClick={() => void load()}>
              Coba lagi
            </button>
          </div>
        ) : (
          <AdventureSkeleton label="Menyiapkan identitas…" />
        )}
      </div>
    );
  if (mode === "designer")
    return (
      <div className="profile-designer profile-appearance-page">
        <CharacterDesigner onBack={() => setMode("profile")} />
      </div>
    );
  const role = roleById(profile.role);
  const level = snapshot?.profile.level ?? profile.level;
  const next = snapshot ? nextLevel(snapshot) : null;
  const achievements = snapshot?.profile.principal_achievements ?? [];
  const joined = new Date(profile.joinedAt);
  return (
    <div className="player-profile">
      <section className="profile-showcase" aria-label="Identitas pemain">
        <div className="profile-identity">
          <div className="profile-avatar-wrap">
            <div className="profile-avatar">
              <AvatarPortrait avatar={profile.avatar} character={profile.equippedCharacter} />
            </div>
            {level != null && (
              <span className="profile-level" aria-label={`Level ${level}`}>
                {level}
              </span>
            )}
          </div>
          <div className="profile-intro">
            <div className="profile-name-row">
              <h3>{profile.displayName}</h3>
              <span className="profile-role-badge">
                <span aria-hidden>{role.icon}</span> {role.name}
              </span>
            </div>
            {profile.username && <p className="profile-username">@{profile.username}</p>}
            <div className="profile-counters">
              <span title="Point">
                <PointCoinIcon />
                {snapshot ? number(snapshot.wallet.current_balance) : "—"}
                <small>Point</small>
              </span>
              <span title="Misi selesai">
                <Star aria-hidden fill="currentColor" strokeWidth={0} />
                {snapshot ? number(snapshot.profile.missions_completed) : "—"}
                <small>Misi</small>
              </span>
            </div>
            <p className="profile-bio">{profile.bio || "Belum ada perkenalan diri."}</p>
          </div>
        </div>
        <div className="profile-character">
          <Suspense
            fallback={
              <AvatarPortrait avatar={profile.avatar} character={profile.equippedCharacter} />
            }
          >
            <AvatarPreview avatar={profile.avatar} character={profile.equippedCharacter} />
          </Suspense>
        </div>
        <div className="profile-showcase-actions">
          <button type="button" className="profile-pill" onClick={() => setEditing(true)}>
            <Pencil aria-hidden />
            Edit profil
          </button>
          <button type="button" className="profile-pill" onClick={() => setMode("designer")}>
            <Shirt aria-hidden />
            Penampilan
          </button>
        </div>
      </section>
      <section className="profile-details" aria-label="Informasi profil">
        <nav className="profile-navigation" aria-label="Bagian profil">
          <button type="button" aria-pressed={tab === "home"} onClick={() => setTab("home")}>
            <House aria-hidden />
            Utama
          </button>
          <button
            type="button"
            aria-pressed={tab === "achievements"}
            onClick={() => setTab("achievements")}
          >
            <Trophy aria-hidden />
            Pencapaian
          </button>
        </nav>
        <div className="profile-details-scroll">
          {error && !editing && (
            <div className="profile-error" role="alert">
              {error} <button onClick={() => void load()}>Muat ulang</button>
            </div>
          )}
          {tab === "home" ? (
            <>
              <section className="profile-progress-card" aria-label="Progression pemain">
                <span className="profile-progress-star">
                  <Star aria-hidden />
                </span>
                <p>Petualanganmu</p>
                <h3>{snapshot?.profile.title || profile.title || role.name}</h3>
                {snapshot ? (
                  <>
                    <strong>Level {snapshot.profile.level}</strong>
                    <progress
                      aria-label="XP menuju level berikutnya"
                      value={snapshot.profile.xp}
                      max={next?.xp ?? Math.max(1, snapshot.profile.xp)}
                    />
                    <span>
                      {number(snapshot.profile.xp)} / {next ? number(next.xp) : "MAX"} XP
                    </span>
                  </>
                ) : (
                  <p>Progression belum terhubung.</p>
                )}
              </section>
              <div className="profile-stat-grid">
                <article>
                  <PointCoinIcon />
                  <strong>{snapshot ? number(snapshot.wallet.earned_today) : "—"}</strong>
                  <span>Point hari ini</span>
                  <small>Dari {number(DAILY_POINT_CAP)} Point · WIB</small>
                </article>
                <article>
                  <Star aria-hidden fill="currentColor" strokeWidth={0} />
                  <strong>{snapshot ? number(snapshot.profile.missions_completed) : "—"}</strong>
                  <span>Misi selesai</span>
                  <small>Terus jelajahi dunia!</small>
                </article>
              </div>
              <dl className="profile-facts">
                <div>
                  <dt>Peran</dt>
                  <dd>{role.name}</dd>
                </div>
                {!Number.isNaN(joined.getTime()) && (
                  <div>
                    <dt>Bergabung</dt>
                    <dd>
                      {joined.toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </dd>
                  </div>
                )}
              </dl>
              {channel && (
                <button
                  type="button"
                  className="profile-channel"
                  disabled={channelBusy}
                  onClick={() => {
                    setSheet(null);
                    void leaveChannel();
                  }}
                >
                  <Radio aria-hidden />
                  <span>
                    <strong>Ganti channel</strong>
                    <small>{channel.replaceAll("-", " ")}</small>
                  </span>
                  <span>Ganti ›</span>
                </button>
              )}
            </>
          ) : (
            <section className="profile-achievements" aria-label="Pencapaian pemain">
              <h3>Pencapaian {snapshot ? `(${achievements.length})` : ""}</h3>
              {achievements.length ? (
                achievements.map((a) => (
                  <article key={`${a.period}-${a.category}`}>
                    <Trophy aria-hidden />
                    <div>
                      <strong>{a.badge}</strong>
                      <p>
                        Peringkat #{a.rank} · {a.period}
                      </p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="profile-empty">
                  <Trophy aria-hidden />
                  <p>{snapshot ? "Belum ada pencapaian." : "Pencapaian belum terhubung."}</p>
                  <span>
                    {snapshot
                      ? "Ikuti misi dan event untuk meraih pencapaianmu."
                      : "Data akan muncul setelah terhubung."}
                  </span>
                </div>
              )}
            </section>
          )}
        </div>
      </section>
      {editing && <ProfileEditor profile={profile} onClose={() => setEditing(false)} />}
    </div>
  );
}
