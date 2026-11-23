import { useState } from "react";
import {
  Armchair,
  Check,
  Fan,
  Fish,
  Flower2,
  LampCeiling,
  Lightbulb,
  LockKeyhole,
  PaintRoller,
  PanelsTopLeft,
  Refrigerator,
  Sparkles,
  Store,
  Wallpaper,
  type LucideIcon,
} from "lucide-react";
import { awningStripe, FLOOR_TILES, WALL_COLOR, type WarungDecorItem } from "@/game/warung/decor";
import { rupiah } from "@/game/warung/model";
import { useWarung, warungCommand } from "@/game/warung/store";
import "./warung-decor.css";

type DecorSlot = WarungDecorItem["slot"];
const GROUPS: { slot: DecorSlot; title: string; icon: LucideIcon; description: string }[] = [
  { slot: "wall", title: "Dinding", icon: PaintRoller, description: "Ganti warna dinding warung." },
  { slot: "awning", title: "Kanopi", icon: Store, description: "Ganti kanopi di depan warung." },
  {
    slot: "floor",
    title: "Lantai",
    icon: PanelsTopLeft,
    description: "Ganti motif lantai warung.",
  },
  {
    slot: "extra",
    title: "Hiasan",
    icon: Sparkles,
    description: "Pasang atau lepas hiasan warung.",
  },
];
const EXTRA_ICONS: Record<string, LucideIcon> = {
  poster: Wallpaper,
  tanaman: Flower2,
  kipas: Fan,
  "lampu-hias": Lightbulb,
  "lampu-gantung": LampCeiling,
  "meja-makan": Armchair,
  "neon-buka": Store,
  "kulkas-neon": Refrigerator,
  akuarium: Fish,
};

/** Small catalog illustrations use the same color maps as the actual shop. */
function DecorArt({ item }: { item: WarungDecorItem }) {
  if (item.slot === "extra") {
    const Icon = EXTRA_ICONS[item.id] ?? Sparkles;
    return <Icon className="warung-decor-extra-art" strokeWidth={1.7} aria-hidden />;
  }
  if (item.slot === "awning") {
    return (
      <svg viewBox="0 0 120 100" aria-hidden>
        <path d="M19 54v32h82V54" fill="#fbf4e9" stroke="#79584d" strokeWidth="4" />
        <path d="M34 86V61h26v25m12 0V61h16v25" fill="#9fcdf0" stroke="#79584d" strokeWidth="3" />
        {Array.from({ length: 6 }, (_, i) => (
          <path
            key={i}
            d={`M${24 + i * 12} 21h12l${(i - 2.5) * 0.8 + 2} 28v7a7 7 0 0 1-14 0v-7Z`}
            fill={awningStripe(item.id, "#e2483d", i)}
          />
        ))}
        <path
          d="M24 21h72l8 28H16Z"
          fill="none"
          stroke="#79584d"
          strokeWidth="3"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  if (item.slot === "floor") {
    const colors = FLOOR_TILES[item.id] ?? FLOOR_TILES["floor-kotak"]!;
    return (
      <svg viewBox="0 0 120 100" aria-hidden>
        <g transform="translate(11 22) skewY(-10)">
          {Array.from({ length: 12 }, (_, i) => (
            <rect
              key={i}
              x={(i % 4) * 24}
              y={Math.floor(i / 4) * 20}
              width="24"
              height="20"
              fill={colors[(i + Math.floor(i / 4)) % 2]}
              stroke="#79584d"
              strokeWidth="1"
            />
          ))}
          <path d="M0 0h96v60H0Z" fill="none" stroke="#79584d" strokeWidth="3" />
        </g>
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 100" aria-hidden>
      <path
        d="M20 21h80v64H20Z"
        fill={WALL_COLOR[item.id] ?? "#f1dfbf"}
        stroke="#79584d"
        strokeWidth="3"
        strokeLinejoin="round"
      />
      {item.id === "wall-bata" && (
        <path
          d="M20 37h80M20 53h80M20 69h80M42 21v16m36 0v16M42 53v16m36 0v16"
          stroke="#e8d2b8"
          strokeWidth="3"
        />
      )}
      <rect
        x="43"
        y="37"
        width="34"
        height="31"
        rx="2"
        fill="#fbf4e9"
        stroke="#79584d"
        strokeWidth="3"
      />
      <path
        d="M60 38v28m-16-14h32M16 86h88"
        stroke="#79584d"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** One category and one selected item at a time; purchases stay server-authoritative. */
export function WarungDecorTab() {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const [slot, setSlot] = useState<DecorSlot>("wall");
  const [selection, setSelection] = useState<Partial<Record<DecorSlot, string>>>({});
  const w = data?.warung;
  if (!w || !data?.decor || !w.style) {
    return <p className="warung-hint">Dekorasi tersedia setelah warung dibuka.</p>;
  }
  const style = w.style;
  const items = data.decor.filter((item) => item.slot === slot);
  const selected = items.find((item) => item.id === selection[slot]) ?? items[0];
  const group = GROUPS.find((g) => g.slot === slot)!;
  const isOwned = (item: WarungDecorItem) => item.price === 0 || style.owned.includes(item.id);
  const isActive = (item: WarungDecorItem) =>
    item.slot === "extra" ? style.extras.includes(item.id) : style[item.slot] === item.id;
  const owned = selected ? isOwned(selected) : false;
  const active = selected ? isActive(selected) : false;
  const lockedLevel = !!selected && !owned && w.level < selected.level;
  const shortCash = !!selected && !owned && w.cash < selected.price;

  return (
    <section className="warung-decor" aria-label="Dekorasi warung">
      <div className="warung-decor-categories" role="group" aria-label="Bagian warung">
        {GROUPS.map(({ slot: id, title, icon: Icon }) => (
          <button key={id} type="button" aria-pressed={slot === id} onClick={() => setSlot(id)}>
            <Icon size={17} aria-hidden />
            {title}
          </button>
        ))}
      </div>
      <div className="warung-decor-workspace">
        <div className="warung-decor-catalog" key={slot}>
          <p className="warung-decor-hint">Pilih untuk melihat detail.</p>
          {items.length ? (
            <ul aria-label={`Pilihan ${group.title.toLowerCase()}`}>
              {items.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    className="warung-decor-item"
                    aria-pressed={selected?.id === item.id}
                    onClick={() => setSelection((current) => ({ ...current, [slot]: item.id }))}
                  >
                    <span className="warung-decor-thumb">
                      <DecorArt item={item} />
                    </span>
                    <span className="warung-decor-item-label">
                      <strong>{item.name}</strong>
                      <small>
                        {isActive(item)
                          ? "Dipakai"
                          : isOwned(item)
                            ? "Dimiliki"
                            : rupiah(item.price)}
                      </small>
                    </span>
                    {isActive(item) ? (
                      <Check
                        className="warung-decor-item-mark"
                        size={17}
                        aria-label="Sedang dipakai"
                      />
                    ) : !isOwned(item) && w.level < item.level ? (
                      <LockKeyhole
                        className="warung-decor-item-mark"
                        size={15}
                        aria-label={`Butuh level ${item.level}`}
                      />
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="warung-decor-hint">Belum ada pilihan untuk bagian ini.</p>
          )}
        </div>
        {selected && (
          <section
            className="warung-decor-detail"
            aria-label={`Detail ${selected.name}`}
            aria-busy={busy}
          >
            <h3>{selected.name}</h3>
            <div className="warung-decor-preview">
              <DecorArt item={selected} />
            </div>
            <p className="warung-decor-description">{group.description}</p>
            <div className="warung-decor-purchase">
              <div className="warung-decor-price">
                <strong>
                  {owned ? (active ? "Sedang dipakai" : "Sudah dimiliki") : rupiah(selected.price)}
                </strong>
                <span>
                  {owned ? "Bisa diganti kapan saja" : `Beli sekali · Level ${selected.level}`}
                </span>
              </div>
              {lockedLevel ? (
                <p className="warung-decor-requirement">
                  Terbuka di warung level {selected.level}.
                </p>
              ) : shortCash ? (
                <p className="warung-decor-requirement">
                  Kas kurang {rupiah(selected.price - w.cash)}.
                </p>
              ) : null}
              <button
                type="button"
                className="warung-cta warung-decor-apply"
                disabled={
                  busy || lockedLevel || shortCash || (owned && active && selected.slot !== "extra")
                }
                onClick={() => {
                  if (!owned) void warungCommand("decor_buy", { decorId: selected.id });
                  else
                    void warungCommand("decor_apply", {
                      decorId: selected.id,
                      ...(selected.slot === "extra" ? { on: !active } : {}),
                    });
                }}
              >
                {busy
                  ? "Menyimpan…"
                  : lockedLevel
                    ? `Butuh level ${selected.level}`
                    : shortCash
                      ? "Kas belum cukup"
                      : !owned
                        ? "Beli dekorasi"
                        : active
                          ? selected.slot === "extra"
                            ? "Lepas hiasan"
                            : "Dipakai"
                          : selected.slot === "extra"
                            ? "Pasang hiasan"
                            : "Pakai dekorasi"}
              </button>
            </div>
          </section>
        )}
      </div>
    </section>
  );
}
