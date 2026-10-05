import { lazy, Suspense, useEffect, useState } from "react";
import { Check, ChevronLeft, RotateCcw, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
const AvatarPreview = lazy(() => import("@/game/avatar/AvatarPreview"));
import {
  ACCESSORIES,
  EXPRESSIONS,
  HAIR_COLORS,
  HAIR_STYLES,
  OUTFITS,
  OUTFIT_COLORS,
  SKIN_TONES,
  type AvatarConfig,
} from "@/identity/avatar";
import { roleById } from "@/identity/roles";
import { useProfile } from "@/identity/profile-store";

function Choice<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { id: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <Button
          key={o.id}
          type="button"
          variant={value === o.id ? "purchase" : "worldSoft"}
          size="sm"
          disabled={o.disabled}
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className="min-h-11"
        >
          {value === o.id && <Check className="size-3.5" />} {o.label}
        </Button>
      ))}
    </div>
  );
}

function Swatches({
  value,
  options,
  onChange,
}: {
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((c) => (
        <Button
          key={c}
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Pilih warna ${c}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className={`grid size-11 place-items-center rounded-full border-2 p-0 transition hover:scale-105 focus-visible:ring-2 focus-visible:ring-world-accent focus-visible:ring-offset-2 ${value === c ? "border-primary ring-2 ring-world-panel-foreground ring-offset-2 ring-offset-primary" : "border-world-outline"}`}
          style={{ backgroundColor: c }}
        >
          {value === c && (
            <span className="grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="size-3.5" />
            </span>
          )}
        </Button>
      ))}
    </div>
  );
}

export function CharacterDesigner({ onBack }: { onBack: () => void }) {
  const profile = useProfile((s) => s.profile);
  const draft = useProfile((s) => s.appearanceDraft);
  const beginEdit = useProfile((s) => s.beginAppearanceEdit);
  const updateAppearance = useProfile((s) => s.updateAppearance);
  const resetAppearance = useProfile((s) => s.resetAppearance);
  const endEdit = useProfile((s) => s.endAppearanceEdit);
  const save = useProfile((s) => s.save);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    beginEdit();
    return () => endEdit();
  }, [beginEdit, endEdit]);
  if (!profile || !draft) return null;
  const set = <K extends keyof AvatarConfig>(key: K, value: AvatarConfig[K]) =>
    updateAppearance(key, value);
  const role = roleById(profile.role);
  const persist = async () => {
    setSaving(true);
    const error = await save({ avatar: draft });
    setSaving(false);
    if (error) return;
    endEdit();
    onBack();
  };
  const cancel = () => {
    resetAppearance();
    endEdit();
    onBack();
  };
  return (
    <div className="space-y-4 pb-[max(0.25rem,env(safe-area-inset-bottom))]">
      <Button type="button" variant="worldGhost" onClick={cancel} className="min-h-11 px-2">
        <ChevronLeft className="size-4" /> Kembali ke profil
      </Button>
      <div className="mx-auto w-full max-w-sm">
        <Suspense fallback={<p>Memuat avatar…</p>}>
          <AvatarPreview avatar={draft} character={profile.equippedCharacter} />
        </Suspense>
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-world-muted">Gaya rambut</p>
        <Choice value={draft.hair} options={HAIR_STYLES} onChange={(v) => set("hair", v)} />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-world-muted">Warna rambut</p>
        <Swatches
          value={draft.hairColor}
          options={HAIR_COLORS}
          onChange={(v) => set("hairColor", v)}
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-world-muted">Warna kulit</p>
        <Swatches value={draft.skin} options={SKIN_TONES} onChange={(v) => set("skin", v)} />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-world-muted">Ekspresi</p>
        <Choice
          value={draft.expression}
          options={EXPRESSIONS}
          onChange={(v) => set("expression", v)}
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-world-muted">Outfit</p>
        <Choice value={draft.outfit} options={OUTFITS} onChange={(v) => set("outfit", v)} />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-world-muted">Warna outfit</p>
        <Swatches
          value={draft.outfitColor}
          options={OUTFIT_COLORS}
          onChange={(v) => set("outfitColor", v)}
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-world-muted">Warna celana</p>
        <Swatches
          value={draft.pantsColor ?? "#384355"}
          options={["#384355", "#243444", "#686358", "#b5a48b"]}
          onChange={(v) => set("pantsColor", v)}
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-world-muted">Warna sepatu</p>
        <Swatches
          value={draft.shoesColor ?? "#344452"}
          options={["#344452", "#322d2b", "#ad6755", "#e5e0d5"]}
          onChange={(v) => set("shoesColor", v)}
        />
      </div>
      <div>
        <p className="mb-2 text-xs font-semibold uppercase text-world-muted">Aksesori</p>
        <Choice
          value={draft.accessory}
          options={ACCESSORIES}
          onChange={(v) => set("accessory", v)}
        />
      </div>
      {draft.outfit !== role.outfit && (
        <p className="rounded-xl bg-world-panel px-3 py-2 text-xs text-world-muted">
          Preset peran {role.icon} {role.name}: {OUTFITS.find((o) => o.id === role.outfit)?.label}.
          Outfit peran tersedia tanpa mengubah pekerjaanmu.
        </p>
      )}
      <div className="sticky bottom-0 grid grid-cols-[auto_1fr] gap-2 border-t border-world-outline bg-world-panel/95 pt-3 backdrop-blur-md">
        <Button
          type="button"
          variant="worldSoft"
          onClick={resetAppearance}
          disabled={saving}
          className="min-h-11"
        >
          <RotateCcw /> Reset
        </Button>
        <Button
          type="button"
          variant="world"
          onClick={() => void persist()}
          disabled={saving}
          className="min-h-11"
        >
          <Save /> {saving ? "Menyimpan…" : "Simpan karakter"}
        </Button>
      </div>
    </div>
  );
}
