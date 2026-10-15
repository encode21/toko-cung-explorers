import { ExplorerWardrobe } from "./ExplorerWardrobe";
import { AppearanceStudio } from "./AppearanceStudio";
import { AppearanceSectionIcon } from "./AppearanceSectionIcon";
import { AppearanceEmotes } from "./AppearanceEmotes";
import { lazy, Suspense, useEffect, useState } from "react";
import { Check, Glasses, Shirt, Smile, Scissors, Palette, ShoppingBag } from "lucide-react";
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
import { useHud } from "@/state/hud-store";

function Choice<T extends string>({
  value,
  options,
  onChange,
  icon: Icon = Shirt,
}: {
  icon?: typeof Shirt;
  value: T;
  options: { id: T; label: string; disabled?: boolean }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="appearance-choices">
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
          {value === o.id && <Check className="appearance-choice-check" />}
          <span className="appearance-choice-art" aria-hidden>
            <Icon />
          </span>
          <span>{o.label}</span>
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
    <div className="appearance-swatches">
      {options.map((c) => (
        <Button
          key={c}
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Pilih warna ${c}`}
          aria-pressed={value === c}
          onClick={() => onChange(c)}
          className="appearance-swatch"
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

function LegacyCharacterDesigner({ onBack }: { onBack: () => void }) {
  const profile = useProfile((s) => s.profile);
  const draft = useProfile((s) => s.appearanceDraft);
  const beginEdit = useProfile((s) => s.beginAppearanceEdit);
  const updateAppearance = useProfile((s) => s.updateAppearance);
  const resetAppearance = useProfile((s) => s.resetAppearance);
  const endEdit = useProfile((s) => s.endAppearanceEdit);
  const save = useProfile((s) => s.save);
  const [section, setSection] = useState<"look" | "closet" | "emotes">("look");
  const [category, setCategory] = useState<"outfit" | "accessory">("outfit");
  const [animation, setAnimation] = useState<string | undefined>();
  const error = useProfile((s) => s.error);
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
    <AppearanceStudio
      onBack={cancel}
      onReset={() => {
        resetAppearance();
        setAnimation(undefined);
      }}
      busy={saving}
      preview={
        <Suspense fallback={<p>Memuat avatar…</p>}>
          <AvatarPreview
            avatar={draft}
            character={profile.equippedCharacter}
            animation={animation}
          />
        </Suspense>
      }
      navigation={
        <nav className="appearance-tabs" aria-label="Kustomisasi">
          <button type="button" aria-pressed="true" disabled={saving}>
            <Palette aria-hidden />
            <span>Sesuaikan</span>
          </button>
          <button
            type="button"
            aria-pressed="false"
            disabled={saving}
            onClick={() => {
              endEdit();
              useHud.getState().setSheet("shop");
            }}
          >
            <ShoppingBag aria-hidden />
            <span>Toko</span>
          </button>
        </nav>
      }
      sideNavigation={
        <nav className="appearance-side-tabs" aria-label="Bagian penampilan">
          {(
            [
              ["look", "Penampilan"],
              ["closet", "Lemari"],
              ["emotes", "Emote"],
            ] as const
          ).map(([id, label]) => (
            <button
              type="button"
              key={id}
              aria-label={label}
              aria-pressed={section === id}
              disabled={saving}
              onClick={() => {
                setSection(id);
                setAnimation(undefined);
              }}
            >
              <AppearanceSectionIcon section={id} />
            </button>
          ))}
        </nav>
      }
      stageAction={
        <button
          type="button"
          className="appearance-stage-save"
          disabled={saving}
          onClick={() => void persist()}
        >
          {saving ? "Menyimpan…" : "Simpan"}
        </button>
      }
    >
      <div className="appearance-legacy-options">
        {section === "closet" && (
          <nav className="appearance-categories" aria-label="Kategori lemari">
            {(
              [
                ["outfit", "Pakaian", Shirt],
                ["accessory", "Aksesori", Glasses],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                type="button"
                key={id}
                aria-pressed={category === id}
                disabled={saving}
                onClick={() => setCategory(id)}
              >
                <Icon aria-hidden />
                <span>{label}</span>
              </button>
            ))}
          </nav>
        )}
        {section === "emotes" && <AppearanceEmotes animation={animation} onChange={setAnimation} />}
        {section === "look" && (
          <div className="space-y-3">
            <div>
              <p className="mb-2 text-xs font-semibold uppercase text-world-muted">Gaya rambut</p>
              <Choice
                icon={Scissors}
                value={draft.hair}
                options={HAIR_STYLES}
                onChange={(v) => set("hair", v)}
              />
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
                icon={Smile}
                value={draft.expression}
                options={EXPRESSIONS}
                onChange={(v) => set("expression", v)}
              />
            </div>
          </div>
        )}
        {section === "closet" && category === "outfit" && (
          <div className="space-y-3">
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
          </div>
        )}
        {section === "closet" && category === "accessory" && (
          <div>
            <p className="mb-2 text-xs font-semibold uppercase text-world-muted">Aksesori</p>
            <Choice
              icon={Glasses}
              value={draft.accessory}
              options={ACCESSORIES}
              onChange={(v) => set("accessory", v)}
            />
          </div>
        )}
        {section === "closet" && draft.outfit !== role.outfit && (
          <p className="rounded-xl bg-world-panel px-3 py-2 text-xs text-world-muted">
            Preset peran {role.icon} {role.name}: {OUTFITS.find((o) => o.id === role.outfit)?.label}
            . Outfit peran tersedia tanpa mengubah pekerjaanmu.
          </p>
        )}
        {error && (
          <p role="alert" className="text-red-200">
            {error}
          </p>
        )}
      </div>
    </AppearanceStudio>
  );
}

export function CharacterDesigner(props: { onBack: () => void }) {
  const character = useProfile((s) => s.profile?.equippedCharacter);
  return character ? <LegacyCharacterDesigner {...props} /> : <ExplorerWardrobe {...props} />;
}
