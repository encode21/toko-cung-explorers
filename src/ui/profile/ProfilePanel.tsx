import { GameInventoryGrid } from "@/ui/game-ui/GamePrimitives";
import { GameTabs } from "@/ui/game-ui/GamePanel";
import { ActionButton, AdventureSkeleton } from "@/ui/adventure/ActionButton";
import { useGameCore } from "@/game/core/store";
import { GameProgress } from "@/ui/hud/GameProgress";
import { AppBridge } from "@/lib/app-bridge";
import { useEffect, useState } from "react";
import { Check, LockKeyhole, PackageOpen, Pencil, Radio, Shirt } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AvatarPortrait } from "@/ui/profile/AvatarPortrait";
import { CharacterDesigner } from "@/ui/profile/CharacterDesigner";
import { COLLECTIBLES, RARITY_COLOR } from "@/identity/characters";
import { ROLES, roleById, type RoleId } from "@/identity/roles";
import { useProfile } from "@/identity/profile-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { leaveChannel, useChannels } from "@/net/channel-store";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const fieldClass =
  "border-world-outline bg-world-panel text-world-panel-foreground placeholder:text-world-muted focus-visible:ring-world-accent";

export function ProfilePanel() {
  const achievements = useGameCore((s) => s.snapshot?.profile.principal_achievements);
  const profile = useProfile((s) => s.profile);
  const owned = useProfile((s) => s.owned);
  const error = useProfile((s) => s.error);
  const saving = useProfile((s) => s.saving);
  const load = useProfile((s) => s.load);
  const save = useProfile((s) => s.save);
  const setSheet = useHud((s) => s.setSheet);
  const channel = useChannels((s) => s.lease?.channel);
  const channelBusy = useChannels((s) => s.busy);
  const [mode, setMode] = useState<"profile" | "designer">("profile");
  const [tab, setTab] = useState<"profile" | "collection">("profile");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    displayName: "",
    username: "",
    bio: "",
    role: "pengunjung" as RoleId,
  });
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    if (profile) {
      setDraft({
        displayName: profile.displayName,
        username: profile.username,
        bio: profile.bio,
        role: profile.role,
      });
    }
  }, [profile]);
  if (error && !profile)
    return (
      <div role="alert">
        {error}
        <Button onClick={() => void load()}>Coba lagi</Button>
      </div>
    );
  if (!profile) {
    return (
      <div className="grid min-h-48 place-items-center text-sm text-world-muted">
        <AdventureSkeleton label="Menyiapkan identitas…" />
      </div>
    );
  }
  if (mode === "designer") return <CharacterDesigner onBack={() => setMode("profile")} />;
  const role = roleById(profile.role);
  const equip = async (id: string | null) => {
    const error = await save({ equippedCharacter: id });
    useGame.getState().setToast(error ?? (id ? "Karakter dipakai" : "Avatar personal dipakai"));
  };
  const persist = async () => {
    const error = await save(draft);
    useGame.getState().setToast(error ?? "Profil tersimpan");
    if (!error) setEditing(false);
  };
  return (
    <div className="flex min-h-0 flex-1 flex-col p-2">
      <GameTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "profile", label: "Karakter & peran" },
          { id: "collection", label: "Koleksi" },
        ]}
      />
      <div className="game-scroll space-y-3">
        {tab === "profile" && (
          <>
            {error && (
              <div role="alert" className="text-sm text-red-300">
                {error}
                <Button onClick={() => void load()}>Muat ulang</Button>
              </div>
            )}
            <div className="game-profile-summary">
              <AvatarPortrait avatar={profile.avatar} character={profile.equippedCharacter} />
              <div className="min-w-0 self-center">
                <h3 className="truncate text-xl font-bold text-world-panel-foreground">
                  {profile.displayName}
                </h3>
                <p className="truncate text-xs text-world-muted">
                  @{profile.username || "pengunjung"}
                </p>
                <span
                  className="mt-2 inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold text-world-accent-foreground"
                  style={{ backgroundColor: role.color }}
                >
                  {role.icon} {role.name}
                </span>
                <p className="mt-2 line-clamp-2 text-xs text-world-muted">
                  {profile.bio || "Lagi menjelajah Toko Cung World."}
                </p>
              </div>
            </div>

            <GameProgress expanded />
            {!!achievements?.length && (
              <section
                aria-label="Principal achievements"
                className="rounded-xl border border-amber-200/20 p-3"
              >
                <h4 className="text-sm font-semibold text-amber-200">Principal Achievements</h4>
                <div className="mt-2 flex flex-wrap gap-2">
                  {achievements.map((a) => (
                    <span
                      key={`${a.period}-${a.category}`}
                      className="rounded-lg bg-amber-200/10 p-2 text-xs text-amber-100"
                    >
                      ✦ {a.badge} · #{a.rank}
                      <span className="block text-[10px] text-slate-400">{a.period}</span>
                    </span>
                  ))}
                </div>
              </section>
            )}
            {channel && (
              <button
                type="button"
                disabled={channelBusy}
                onClick={() => {
                  setSheet(null);
                  void leaveChannel();
                }}
                className="flex min-h-11 w-full items-center justify-between gap-3 rounded-xl border border-world-outline bg-world-panel px-3 text-left text-sm text-world-panel-foreground transition active:scale-[0.99] disabled:opacity-50"
              >
                <span className="flex min-w-0 items-center gap-2">
                  <Radio className="size-4 shrink-0 text-world-accent" />
                  <span className="min-w-0">
                    <span className="block font-semibold">Ganti channel</span>
                    <span className="block truncate text-[11px] text-world-muted">
                      Sekarang: {channel.replace("-", " ")}
                    </span>
                  </span>
                </span>
                <span className="shrink-0 text-xs text-world-accent">Pilih</span>
              </button>
            )}
            {editing ? (
              <div className="space-y-3 rounded-2xl bg-world-panel p-3">
                <Input
                  aria-label="Nama tampilan"
                  value={draft.displayName}
                  maxLength={18}
                  onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
                  placeholder="Nama tampilan"
                  className={fieldClass}
                />
                <Input
                  aria-label="Username"
                  value={draft.username}
                  maxLength={24}
                  onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                  placeholder="username_unik"
                  className={fieldClass}
                />
                <Textarea
                  aria-label="Bio"
                  value={draft.bio}
                  maxLength={140}
                  onChange={(e) => setDraft({ ...draft, bio: e.target.value })}
                  placeholder="Status singkat…"
                  className={fieldClass}
                />
                <div className="grid grid-cols-2 gap-2">
                  {ROLES.filter((r) => r.selfSelectable).map((r) => (
                    <Button
                      key={r.id}
                      type="button"
                      variant={draft.role === r.id ? "purchase" : "worldOutline"}
                      onClick={() => setDraft({ ...draft, role: r.id })}
                      className="justify-start"
                    >
                      {r.icon} {r.name}
                    </Button>
                  ))}
                </div>
                <Button variant="worldOutline" onClick={() => setEditing(false)}>
                  Batal edit
                </Button>
                <ActionButton
                  type="button"
                  busy={saving}
                  busyLabel="Menyimpan…"
                  onClick={() => void persist()}
                  className="w-full"
                >
                  Simpan profil
                </ActionButton>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="worldOutline"
                  onClick={() => setEditing(true)}
                  className="min-h-11"
                >
                  <Pencil /> Edit profil
                </Button>
                <Button
                  type="button"
                  variant="purchase"
                  onClick={() => setMode("designer")}
                  className="min-h-11"
                >
                  <Shirt /> Customize
                </Button>
              </div>
            )}
          </>
        )}
        {tab === "collection" && (
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-bold text-world-panel-foreground">Koleksi Karakter</h3>
              <span className="text-xs text-world-muted">{owned.length} dimiliki</span>
            </div>
            <GameInventoryGrid>
              <article className="grid grid-cols-[4rem_1fr_auto] items-center gap-3 rounded-2xl bg-world-panel p-2.5">
                <AvatarPortrait avatar={profile.avatar} size="sm" />
                <div>
                  <p className="font-semibold text-sm text-world-panel-foreground">
                    Avatar Personal
                  </p>
                  <p className="text-[11px] text-world-muted">Starter · Milikmu</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant={profile.equippedCharacter ? "worldOutline" : "active"}
                  onClick={() => void equip(null)}
                >
                  {profile.equippedCharacter ? "Pakai" : "Dipakai"}
                </Button>
              </article>
              {COLLECTIBLES.map((item) => {
                const isOwned = owned.includes(item.id);
                const equipped = profile.equippedCharacter === item.id;
                return (
                  <article
                    key={item.id}
                    className="grid grid-cols-[4rem_1fr] gap-3 rounded-2xl bg-world-panel p-2.5"
                  >
                    <AvatarPortrait
                      avatar={profile.avatar}
                      character={item.id === "koko-cung" ? item.id : null}
                      size="sm"
                    />
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-1">
                        <p className="font-semibold text-sm text-world-panel-foreground">
                          {item.name}
                        </p>
                        {item.badges.map((b) => (
                          <span
                            key={b}
                            className="rounded-full px-2 py-0.5 text-[9px] font-bold text-world-accent-foreground"
                            style={{ backgroundColor: RARITY_COLOR[item.rarity] }}
                          >
                            {b}
                          </span>
                        ))}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-[11px] text-world-muted">
                        {item.description}
                      </p>
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-semibold text-world-panel-foreground">
                          {isOwned
                            ? "Dimiliki"
                            : item.priceIdr
                              ? rupiah.format(item.priceIdr)
                              : "Segera hadir"}
                        </span>
                        {isOwned ? (
                          <Button
                            type="button"
                            size="sm"
                            variant={equipped ? "active" : "world"}
                            disabled={equipped}
                            onClick={() => void equip(item.id)}
                          >
                            {equipped ? (
                              <>
                                <Check /> Dipakai
                              </>
                            ) : (
                              "Pakai"
                            )}
                          </Button>
                        ) : item.availability === "available" ? (
                          <AppBridge className="text-xs underline" />
                        ) : (
                          <span className="flex items-center gap-1 text-[10px] text-world-muted">
                            <LockKeyhole className="size-3" /> Coming Soon
                          </span>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </GameInventoryGrid>
          </section>
        )}
        <div className="flex items-center gap-2 rounded-xl bg-world-panel px-3 py-2 text-xs text-world-muted">
          <PackageOpen className="size-4 shrink-0" /> Skin dan karakter premium tidak memberi
          keuntungan gameplay.
        </div>
      </div>
    </div>
  );
}
