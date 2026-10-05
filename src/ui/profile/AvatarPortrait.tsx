import type { AvatarConfig } from "@/identity/avatar";

/** Potret CSS ringan untuk kartu profil; preview 3D penuh ada di Character Designer. */
export function AvatarPortrait({ avatar, character, size = "lg" }: { avatar: AvatarConfig; character?: string | null; size?: "sm" | "lg" }) {
  const koko = character === "koko-cung";
  const outfit = koko ? "#c8242f" : avatar.outfit === "cashier" ? "#d9503f" : avatar.outfit === "warehouse" ? "#e8862e" : avatar.outfit === "driver" ? "#2f5f9e" : avatar.outfitColor;
  const wink = koko || avatar.expression === "wink";
  const calm = avatar.expression === "calm";
  return (
    <div className={`relative shrink-0 overflow-hidden rounded-2xl bg-world-panel ${size === "sm" ? "size-12" : "aspect-square w-full"}`} aria-label="Pratinjau avatar aktif">
      <div className="absolute inset-x-[28%] top-[13%] aspect-square rounded-full" style={{ backgroundColor: avatar.skin }}>
        <HairPreview style={koko ? "buns" : avatar.hair} color={koko ? "var(--character-hair)" : avatar.hairColor} />
        <span className={`absolute top-[47%] left-[26%] w-[8%] rounded-full bg-foreground ${calm ? "h-[3%]" : "aspect-square"}`} />
        <span className={`absolute top-[47%] right-[26%] w-[8%] rounded-full bg-foreground ${wink || calm ? "h-[3%]" : "aspect-square"}`} />
        <span className={`absolute right-[38%] bottom-[18%] w-[24%] rounded-b-full bg-world-brand ${avatar.expression === "grin" ? "h-[9%]" : "h-[5%]"}`} />
        {avatar.accessory === "glasses" && <span className="absolute inset-x-[15%] top-[40%] h-[20%] rounded-full border-2 border-foreground" />}
        {avatar.accessory === "headset" && <span className="absolute inset-x-[-7%] top-[23%] h-[42%] rounded-t-full border-[3px] border-foreground border-b-0" />}
      </div>
      <div className="absolute right-[23%] bottom-[-5%] left-[23%] h-[48%] rounded-t-[38%]" style={{ backgroundColor: outfit }}>
        {koko && <span className="absolute inset-x-0 top-[8%] mx-auto h-[5%] w-[60%] rounded-full bg-world-accent" />}
        {!koko && avatar.accessory === "scarf" && <span className="absolute inset-x-[10%] top-0 h-[10%] rounded-full bg-world-brand" />}
      </div>
      {koko && <span className="absolute right-[8%] bottom-[5%] rounded-full bg-world-accent px-2 py-0.5 font-bold text-[9px] text-world-accent-foreground">KOKO</span>}
    </div>
  );
}

function HairPreview({ style, color }: { style: AvatarConfig["hair"]; color: string }) {
  if (style === "cap") return <><span className="absolute inset-x-[-5%] top-[-10%] h-[35%] rounded-t-full" style={{ backgroundColor: color }} /><span className="absolute left-[48%] top-[18%] h-[8%] w-[42%] rounded-full" style={{ backgroundColor: color }} /></>;
  if (style === "buns") return <><span className="absolute inset-x-[-4%] top-[-9%] h-[42%] rounded-t-full" style={{ backgroundColor: color }} /><span className="absolute -left-[8%] -top-[4%] size-[25%] rounded-full" style={{ backgroundColor: color }} /><span className="absolute -right-[8%] -top-[4%] size-[25%] rounded-full" style={{ backgroundColor: color }} /></>;
  if (style === "spiky") return <><span className="absolute inset-x-[-4%] top-[-5%] h-[38%] rounded-t-full" style={{ backgroundColor: color }} /><span className="absolute left-[18%] -top-[17%] size-[25%] rotate-45" style={{ backgroundColor: color }} /><span className="absolute right-[18%] -top-[17%] size-[25%] rotate-45" style={{ backgroundColor: color }} /></>;
  if (style === "bob") return <span className="absolute inset-x-[-9%] top-[-9%] h-[70%] rounded-t-full" style={{ backgroundColor: color }} />;
  return <span className="absolute inset-x-[-4%] top-[-9%] h-[42%] rounded-t-full" style={{ backgroundColor: color }} />;
}