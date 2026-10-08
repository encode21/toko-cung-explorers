import { useEffect, useState } from "react";
import { Check, LockKeyhole, PackageOpen, Pencil, Shirt, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AvatarPortrait } from "@/ui/profile/AvatarPortrait";
import { CharacterDesigner } from "@/ui/profile/CharacterDesigner";
import { COLLECTIBLES, RARITY_COLOR } from "@/identity/characters";
import { ROLES, roleById, type RoleId } from "@/identity/roles";
import { useProfile } from "@/identity/profile-store";
import { useGame } from "@/state/game-store";

const rupiah = new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0,
});

const fieldClass =
  "border-world-outline bg-world-panel text-world-panel-foreground placeholder:text-world-muted focus-visible:ring-world-accent";

export function ProfilePanel() {
  const profile = useProfile((s) => s.profile);
  const owned = useProfile((s) => s.owned);
  const error = useProfile((s) => s.error);
  const saving = useProfile((s) => s.saving);
  const loading = useProfile((s) => s.loading);
  const load = useProfile((s) => s.load);
  const save = useProfile((s) => s.save);
  const [mode, setMode] = useState<"profile" | "designer">("profile");
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
  if (loading || !profile) {
    return (
      <div className="grid min-h-48 place-items-center text-sm text-world-muted">
        Menyiapkan identitas…
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
    <div className="space-y-5 pb-2">
      {error && (
        <div role="alert" className="text-sm text-red-300">
          {error}
          <Button onClick={() => void load()}>Muat ulang</Button>
        </div>
      )}
      <div className="grid grid-cols-[7rem_1fr] gap-4">
        <AvatarPortrait avatar={profile.avatar} character={profile.equippedCharacter} />
        <div className="min-w-0 self-center">
          <h3 className="truncate text-xl font-bold text-world-panel-foreground">
            {profile.displayName}
          </h3>
          <p className="truncate text-xs text-world-muted">@{profile.username || "pengunjung"}</p>
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
          <Button
            type="button"
            variant="world"
            disabled={saving}
            onClick={() => void persist()}
            className="w-full min-h-11"
          >
            <Check /> Simpan profil
          </Button>
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

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h3 className="font-bold text-world-panel-foreground">Koleksi Karakter</h3>
          <span className="text-xs text-world-muted">{owned.length} dimiliki</span>
        </div>
        <div className="grid gap-2">
          <article className="grid grid-cols-[4rem_1fr_auto] items-center gap-3 rounded-2xl bg-world-panel p-2.5">
            <AvatarPortrait avatar={profile.avatar} size="sm" />
            <div>
              <p className="font-semibold text-sm text-world-panel-foreground">Avatar Personal</p>
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
                    <p className="font-semibold text-sm text-world-panel-foreground">{item.name}</p>
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
                      <Button
                        type="button"
                        size="sm"
                        variant="purchase"
                        onClick={() =>
                          useGame.getState().setToast("Pembelian Koko Cung segera dibuka")
                        }
                      >
                        <Sparkles /> Beli
                      </Button>
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
        </div>
      </section>
      <div className="flex items-center gap-2 rounded-xl bg-world-panel px-3 py-2 text-xs text-world-muted">
        <PackageOpen className="size-4 shrink-0" /> Skin dan karakter premium tidak memberi
        keuntungan gameplay.
      </div>
    </div>
  );
}
