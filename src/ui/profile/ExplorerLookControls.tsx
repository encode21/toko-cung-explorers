import { useState, type ReactNode } from "react";
import { Check } from "lucide-react";
import { HAIR_STYLES, EXPRESSIONS, type AvatarConfig } from "@/identity/avatar";
import {
  EXPLORER_GENDERS,
  EXPLORER_AGES,
  EXPLORER_BUILDS,
  equipExplorer,
  type ExplorerAppearance,
} from "@/identity/explorer";
import { CROWN_HATS } from "@/identity/wardrobe";
import { ExplorerLookIcon } from "./ExplorerLookIcon";

export function ExplorerLookControls({
  avatar,
  appearance,
  onAppearance,
  onIdentity,
  children,
}: {
  avatar: AvatarConfig;
  appearance: ExplorerAppearance;
  onAppearance: (value: ExplorerAppearance) => void;
  onIdentity: <K extends "hair" | "expression">(key: K, value: AvatarConfig[K]) => void;
  children: ReactNode;
}) {
  const [tab, setTab] = useState<"body" | "hair" | "face" | "colors">("body");
  const icon = (kind: typeof tab, id: string) => (
    <ExplorerLookIcon
      kind={kind}
      id={id}
      skin={appearance.colors.skin}
      hair={appearance.colors.hair}
    />
  );
  return (
    <>
      <nav className="explorer-look-tabs" aria-label="Kategori penampilan">
        {(
          [
            ["body", "Tubuh"],
            ["hair", "Rambut"],
            ["face", "Wajah"],
            ["colors", "Warna"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            aria-pressed={tab === id}
            onClick={(event) => {
              setTab(id);
              event.currentTarget.closest(".appearance-options")?.scrollTo({ top: 0 });
            }}
          >
            {icon(id, id === "body" ? "regular" : id === "hair" ? "buns" : "smile")}
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {tab === "colors" ? (
        children
      ) : (
        <div className="explorer-look-controls">
          {tab === "body" && (
            <>
              <LookChoice
                label="Gender karakter"
                value={appearance.gender}
                options={EXPLORER_GENDERS}
                onChange={(gender) => onAppearance({ ...appearance, gender })}
              />
              <LookChoice
                label="Usia karakter"
                value={appearance.age}
                options={EXPLORER_AGES}
                onChange={(age) => onAppearance({ ...appearance, age })}
              />
              <LookChoice
                label="Bentuk tubuh"
                value={appearance.build}
                options={EXPLORER_BUILDS}
                art={(id) => icon("body", id)}
                onChange={(build) => onAppearance({ ...appearance, build })}
              />
            </>
          )}
          {tab === "hair" && (
            <>
              <LookChoice
                label="Gaya rambut"
                value={avatar.hair === "cap" ? "short" : avatar.hair}
                options={HAIR_STYLES.filter((item) => item.id !== "cap")}
                art={(id) => icon("hair", id)}
                onChange={(value) => {
                  onIdentity("hair", value);
                  if (CROWN_HATS.includes(appearance.headwear))
                    onAppearance(equipExplorer(appearance, "headwear", "none"));
                }}
              />
              <p>Memilih rambut melepas topi. Pakai kembali topimu lewat Lemari.</p>
            </>
          )}
          {tab === "face" && (
            <LookChoice
              label="Ekspresi wajah"
              value={avatar.expression}
              options={EXPRESSIONS}
              art={(id) => icon("face", id)}
              onChange={(value) => onIdentity("expression", value)}
            />
          )}
        </div>
      )}
    </>
  );
}
function LookChoice<T extends string>({
  label,
  value,
  options,
  onChange,
  art,
}: {
  label: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (value: T) => void;
  art?: (id: T) => ReactNode;
}) {
  return (
    <fieldset>
      <legend>{label}</legend>
      <div className={art ? "explorer-look-grid" : "explorer-look-chips"}>
        {options.map((option) => (
          <button
            type="button"
            key={option.id}
            aria-pressed={value === option.id}
            onClick={() => onChange(option.id)}
          >
            {art && (
              <span className="explorer-look-art">
                {art(option.id)}
                {value === option.id && <Check className="explorer-look-check" aria-hidden />}
              </span>
            )}
            <span>{option.label}</span>
          </button>
        ))}
      </div>
    </fieldset>
  );
}
