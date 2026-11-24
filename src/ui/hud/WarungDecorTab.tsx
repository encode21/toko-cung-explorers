import { useEffect, useRef, useState, lazy, Suspense, type ReactNode } from "react";
import {
  Check,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  RotateCw,
  Move,
  LockKeyhole,
  PaintRoller,
  PanelsTopLeft,
  Sparkles,
  Store,
  type LucideIcon,
} from "lucide-react";
import {
  awningStripe,
  FLOOR_TILES,
  WALL_COLOR,
  type WarungDecorItem,
  type DecorPlacement,
} from "@/game/warung/decor";
const WarungDecorPreview = lazy(() => import("@/game/warung/WarungDecorPreview"));
import {
  getDecorInstances,
  getDecorRule,
  nudgeDecorPlacement,
  constrainDecorPlacement,
} from "@/game/warung/decor-placement";
import { rupiah } from "@/game/warung/model";
import { useWarung, warungCommand } from "@/game/warung/store";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
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

/** Product silhouettes reflect the decor objects already built in extraParts. */
function ExtraDecorArt({ id }: { id: string }) {
  return (
    <svg viewBox="0 0 120 100" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="88" rx="38" ry="5" fill="#dbc9b3" opacity=".65" />
      <g stroke="#79584d" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        {id === "tanaman" ? (
          <>
            <path d="M44 64h33l-5 24H49z" fill="#c4653f" />
            <path d="M60 67V27" stroke="#467b49" strokeWidth="4" />
            <path d="M59 53C34 59 24 38 32 27c19-2 31 10 27 26Z" fill="#4dae57" />
            <path d="M62 49c23 4 34-13 29-27-21-6-32 10-29 27Z" fill="#5fbf63" />
            <path d="M61 34C43 26 47 11 61 9c13 2 18 19 0 25Z" fill="#3f9a4c" />
          </>
        ) : id === "poster" ? (
          <>
            <path d="m17 24 38-9 13 62-38 9Z" fill="#ffd23f" />
            <path d="m55 13 46 7-10 65-46-7Z" fill="#ff7ab6" />
            <path d="m62 30 30 5m-34 32 29 5" stroke="#fffaf3" strokeWidth="7" />
            <path d="m25 40 24-5m-18 35 18-4" stroke="#e2483d" strokeWidth="6" />
            <path d="m66 43 15 2 5 14-24-4Z" fill="#ffe1a3" />
          </>
        ) : id === "kipas" ? (
          <>
            <path d="M50 70h20l6 18H44Z" fill="#f4f4f4" />
            <circle cx="60" cy="43" r="31" fill="#e9f6fb" />
            <path d="M57 40c-18-30 21-34 10-2 34-5 18 31-5 10-17 29-38-5-5-8Z" fill="#5ab8dd" />
            <circle cx="60" cy="43" r="6" fill="#fffaf3" />
            <circle cx="60" cy="43" r="26" stroke="#a9c9d2" strokeWidth="1.5" />
          </>
        ) : id === "lampu-hias" ? (
          <>
            <path d="M12 25c24 24 72 24 96 0" stroke="#4c4b46" strokeWidth="3" />
            {["#ffe14d", "#ff5c9a", "#5fe0ff", "#8dff6a", "#ffe14d"].map((color, i) => (
              <g
                key={color + i}
                transform={`translate(${22 + i * 19} ${37 + Math.sin(i * 0.8) * 10})`}
              >
                <path d="M0-7v9" stroke="#4c4b46" />
                <path d="M-5 0h10l3 11a8 8 0 0 1-16 0Z" fill={color} />
              </g>
            ))}
          </>
        ) : id === "lampu-gantung" ? (
          <>
            <path d="M60 10v35" stroke="#3a3a3a" strokeWidth="4" />
            <path d="M49 39h22l19 28H30Z" fill="#2f6f5e" />
            <ellipse cx="60" cy="67" rx="30" ry="8" fill="#5c9988" />
            <path d="M50 67a10 10 0 0 0 20 0" fill="#fff3a6" />
          </>
        ) : id === "meja-makan" ? (
          <>
            <path d="M59 48v35m-13 4 13-4 14 4" stroke="#7c5534" strokeWidth="5" />
            <ellipse cx="60" cy="45" rx="37" ry="15" fill="#c99a6a" />
            <path d="M57 30h8v12h-8z" fill="#ff8a3d" />
            <path d="M19 69v17m81-17v17m-50-7v14" stroke="#7c5534" strokeWidth="6" />
            <ellipse cx="19" cy="67" rx="11" ry="6" fill="#59b36a" />
            <ellipse cx="100" cy="67" rx="11" ry="6" fill="#f2c14e" />
            <ellipse cx="50" cy="77" rx="11" ry="6" fill="#3fa7c9" />
          </>
        ) : id === "neon-buka" ? (
          <>
            <path d="m34 31 26-19 26 19" stroke="#7c5534" />
            <rect x="14" y="31" width="92" height="42" rx="7" fill="#2f3134" />
            <rect x="20" y="37" width="80" height="30" rx="4" stroke="#ff7ab6" />
            <path
              d="M29 44v16h6a4 4 0 0 0 0-8h-6 5a4 4 0 0 0 0-8Zm15 0v11c0 7 10 7 10 0V44m8 0v16m0-8 10-8m-10 8 10 8m5 0 5-16 5 16m-8-5h6"
              stroke="#5fe0ff"
              strokeWidth="2"
            />
          </>
        ) : id === "kulkas-neon" ? (
          <>
            <rect x="35" y="9" width="50" height="79" rx="5" fill="#f4f4f4" />
            <rect x="41" y="23" width="38" height="56" rx="2" fill="#bfe6f7" />
            <path d="M41 17h38" stroke="#ff4fa3" strokeWidth="5" />
            <path d="M42 83h36" stroke="#3fe0ff" strokeWidth="3" />
            {[35, 52, 69].map((y) => (
              <g key={y}>
                <path d={`M43 ${y + 5}h34`} stroke="#fffaf3" />
                {["#e2483d", "#59b36a", "#f2c14e"].map((color, i) => (
                  <rect
                    key={color}
                    x={46 + i * 10}
                    y={y - 6}
                    width="6"
                    height="10"
                    rx="2"
                    fill={color}
                    strokeWidth="1"
                  />
                ))}
              </g>
            ))}
          </>
        ) : id === "akuarium" ? (
          <>
            <path d="M22 67h76v21H22Z" fill="#7c5534" />
            <path d="M18 20h84v48H18Z" fill="#7fd3f0" />
            <path d="M19 62h82v6H19Z" fill="#e8d39a" strokeWidth="1" />
            <path
              d="M29 62V43m0 11-5-6m5 2 5-9m53 21V43m0 12 7-7"
              stroke="#4f9d55"
              strokeWidth="3"
            />
            <path d="m41 34 7-5v10Zm7 0c8-13 23 0 0 0Z" fill="#ff8a3d" strokeWidth="1.5" />
            <path d="m76 48-7-5v10Zm-7 0c-8-13-23 0 0 0Z" fill="#ffd23f" strokeWidth="1.5" />
            <path d="m26 27 18-3m31 0 18 3" stroke="#eaf9f5" strokeWidth="3" />
          </>
        ) : (
          <path d="m60 17 11 25 27 3-21 18 6 26-23-14-23 14 6-26-21-18 27-3Z" fill="#ffe1a3" />
        )}
      </g>
    </svg>
  );
}

/** Small catalog illustrations use the same color maps as the actual shop. */
function DecorArt({ item }: { item: WarungDecorItem }) {
  if (item.slot === "extra") {
    return <ExtraDecorArt id={item.id} />;
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
export function WarungDecorTab({ header }: { header: ReactNode }) {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const [slot, setSlot] = useState<DecorSlot>("wall");
  const [selection, setSelection] = useState<Partial<Record<DecorSlot, string>>>({});
  const [pending, setPending] = useState(false);
  const [selectedInstance, setSelectedInstance] = useState<string | null>(null);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [actionError, setActionError] = useState("");
  const [notice, setNotice] = useState("");
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const w = data?.warung;
  if (!w || !data?.decor || !w.style) {
    return <p className="warung-decor-empty">Dekorasi tersedia setelah warung dibuka.</p>;
  }
  const style = w.style;
  const items = data.decor.filter((item) => item.slot === slot);
  const isOwned = (item: WarungDecorItem) => item.price === 0 || style.owned.includes(item.id);
  const isActive = (item: WarungDecorItem) =>
    item.slot === "extra" ? style.extras.includes(item.id) : style[item.slot] === item.id;
  const selected =
    items.find((item) => item.id === selection[slot]) ?? items.find(isActive) ?? items[0];
  const group = GROUPS.find((g) => g.slot === slot)!;
  const owned = selected ? isOwned(selected) : false;
  const active = selected ? isActive(selected) : false;
  const lockedLevel = !!selected && !owned && w.level < selected.level;
  const shortCash = !!selected && !owned && w.cash < selected.price;
  const unavailable = busy || pending;
  const previewStyle = selected
    ? selected.slot === "extra"
      ? { ...style, extras: Array.from(new Set([...style.extras, selected.id])) }
      : { ...style, [selected.slot]: selected.id }
    : style;
  const instances = getDecorInstances(previewStyle).filter((item) => item.decorId === selected?.id);
  const instance = instances.find((item) => item.id === selectedInstance) ?? instances[0];
  const rule = selected?.slot === "extra" ? getDecorRule(selected.id) : null;
  const canPlace = !!data.decorPlacementSupported && owned && active && selected?.slot === "extra";
  const place = async (instanceId: string, placement: DecorPlacement) => {
    if (!canPlace || unavailable || !selected) return false;
    setPending(true);
    setActionError("");
    setNotice("");
    const result = await warungCommand("decor_place", {
      decorId: selected.id,
      instanceId,
      placement,
    });
    if (!mounted.current) return !!result;
    setPending(false);
    if (!result) {
      setActionError(
        useWarung.getState().error || "Posisi belum tersimpan. Geser lagi untuk mencoba.",
      );
      return false;
    }
    setNotice("Posisi tersimpan.");
    return true;
  };
  const nudge = (direction: "left" | "right" | "up" | "down") => {
    if (!instance || !canPlace || unavailable) return;
    const next = nudgeDecorPlacement(instance.id, instance.placement, direction, style);
    if (next) void place(instance.id, next);
    else setActionError("Tempat ini terhalang. Geser ke tempat lain.");
  };
  const rotate = () => {
    if (!instance || !canPlace || unavailable || rule?.surface === "wall") return;
    const next = constrainDecorPlacement(
      instance.id,
      { ...instance.placement, rotation: instance.placement.rotation + Math.PI / 2 },
      style,
    );
    if (next) void place(instance.id, next);
    else setActionError("Ruang belum cukup untuk memutar hiasan.");
  };
  const act = async () => {
    if (
      !selected ||
      unavailable ||
      lockedLevel ||
      shortCash ||
      (owned && active && selected.slot !== "extra")
    )
      return;
    setPending(true);
    setActionError("");
    setNotice("");
    const result = await warungCommand(owned ? "decor_apply" : "decor_buy", {
      decorId: selected.id,
      ...(owned && selected.slot === "extra" ? { on: !active } : {}),
    });
    if (!mounted.current) return;
    setPending(false);
    if (!result) {
      setActionError(useWarung.getState().error || "Dekorasi belum tersimpan. Coba lagi.");
    } else {
      setNotice(
        !owned
          ? `${selected.name} berhasil dibeli.`
          : active && selected.slot === "extra"
            ? `${selected.name} dilepas.`
            : `${selected.name} dipakai.`,
      );
    }
  };

  return (
    <>
      <section className="warung-decor-stage" aria-label="Pratinjau warung">
        <Suspense
          fallback={
            <div className="warung-decor-preview-loading" role="status">
              Menyiapkan pratinjau…
            </div>
          }
        >
          <WarungDecorPreview
            level={w.level}
            style={previewStyle}
            slot={slot}
            selectedId={selected?.id ?? null}
            selectedInstanceId={instance?.id ?? null}
            disabled={unavailable}
            canPlace={canPlace}
            placementToolsOpen={toolsOpen && canPlace}
            onSelectInstance={(id) => {
              const target = getDecorInstances(previewStyle).find((item) => item.id === id);
              if (!target) return;
              setSelectedInstance(id);
              setSelection((current) => ({ ...current, extra: target.decorId }));
              setActionError("");
              setNotice("");
            }}
            onPlacementChange={place}
          />
        </Suspense>
        {selected && (
          <>
            <div className="warung-decor-stage-info">
              <h3>{selected.name}</h3>
              <p>
                {slot === "floor"
                  ? "Lihat lantai dengan ruangan kosong."
                  : slot === "extra"
                    ? rule?.label
                    : group.description}
              </p>
              {slot === "extra" && (
                <p className="warung-decor-drag-hint">
                  {canPlace
                    ? "Geser hiasan untuk mengatur posisinya."
                    : !owned
                      ? "Beli dan pasang untuk mengatur posisi."
                      : !active
                        ? "Pasang hiasan untuk mengatur posisi."
                        : "Penataan posisi tersedia setelah pembaruan game."}
                </p>
              )}
            </div>
            <div className="warung-decor-stage-actions" aria-busy={pending}>
              {slot === "extra" && canPlace && instance && toolsOpen && (
                <div className="warung-decor-placement-tools" aria-label="Atur posisi hiasan">
                  {instances.length > 1 && (
                    <select
                      aria-label="Pilih hiasan"
                      value={instance.id}
                      disabled={unavailable}
                      onChange={(event) => setSelectedInstance(event.target.value)}
                    >
                      {instances.map((item, index) => (
                        <option key={item.id} value={item.id}>
                          Hiasan {index + 1} dari {instances.length}
                        </option>
                      ))}
                    </select>
                  )}
                  <div className="warung-decor-nudge" role="group" aria-label="Geser hiasan">
                    {(
                      [
                        ["left", "Geser ke kiri", ArrowLeft],
                        ["up", "Geser ke atas", ArrowUp],
                        ["down", "Geser ke bawah", ArrowDown],
                        ["right", "Geser ke kanan", ArrowRight],
                      ] as const
                    ).map(([direction, label, Icon]) => (
                      <button
                        key={direction}
                        type="button"
                        aria-label={label}
                        title={label}
                        disabled={unavailable}
                        onClick={() => nudge(direction)}
                      >
                        <Icon size={18} aria-hidden />
                      </button>
                    ))}
                  </div>
                  {rule?.surface !== "wall" && (
                    <button
                      type="button"
                      className="warung-decor-rotate"
                      aria-label="Putar hiasan"
                      title="Putar hiasan"
                      disabled={unavailable}
                      onClick={rotate}
                    >
                      <RotateCw size={18} aria-hidden />
                    </button>
                  )}
                </div>
              )}
              {lockedLevel ? (
                <p className="warung-decor-requirement">Butuh warung level {selected.level}.</p>
              ) : shortCash ? (
                <p className="warung-decor-requirement">
                  Kas kurang {rupiah(selected.price - w.cash)}.
                </p>
              ) : null}
              {actionError && (
                <p className="warung-decor-error" role="alert">
                  {actionError}
                </p>
              )}
              <p className="warung-decor-notice" role="status">
                {notice}
              </p>
              <div className="warung-decor-primary-actions">
                <button
                  type="button"
                  className="warung-decor-apply"
                  aria-label={
                    !owned ? `Beli dekorasi ${selected.name} ${rupiah(selected.price)}` : undefined
                  }
                  disabled={
                    unavailable ||
                    lockedLevel ||
                    shortCash ||
                    (owned && active && selected.slot !== "extra")
                  }
                  onClick={() => void act()}
                >
                  {!owned && <KasMoneyIcon aria-hidden />}
                  {pending
                    ? "Menyimpan…"
                    : lockedLevel
                      ? `Butuh level ${selected.level}`
                      : shortCash
                        ? "Kas belum cukup"
                        : !owned
                          ? `Beli · ${rupiah(selected.price)}`
                          : active
                            ? selected.slot === "extra"
                              ? "Lepas hiasan"
                              : "Terpasang"
                            : selected.slot === "extra"
                              ? "Pasang hiasan"
                              : "Pakai dekorasi"}
                </button>
                {slot === "extra" && canPlace && (
                  <button
                    type="button"
                    className="warung-decor-tools-toggle"
                    aria-label="Atur posisi"
                    title="Atur posisi"
                    aria-expanded={toolsOpen}
                    onClick={() => setToolsOpen((open) => !open)}
                  >
                    <Move size={20} aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </section>
      <section className="appearance-catalog warung-decor-sheet" aria-label="Katalog dekorasi">
        {header}
        <div className="warung-decor">
          <nav className="warung-decor-categories" aria-label="Bagian warung">
            {GROUPS.map(({ slot: id, title, icon: Icon }) => (
              <button
                key={id}
                type="button"
                aria-current={slot === id ? "page" : undefined}
                disabled={pending}
                onClick={() => {
                  setSlot(id);
                  setToolsOpen(false);
                  setSelectedInstance(null);
                  setActionError("");
                  setNotice("");
                }}
              >
                <Icon size={26} strokeWidth={2.2} aria-hidden />
                <span>{title}</span>
              </button>
            ))}
          </nav>
          <div className="warung-decor-workspace">
            <section
              className="warung-decor-catalog"
              key={slot}
              aria-label={`Pilihan ${group.title.toLowerCase()}`}
            >
              <div className="warung-decor-catalog-heading">
                <h3>{group.title}</h3>
                <p>{group.description}</p>
              </div>
              {items.length ? (
                <ul>
                  {items.map((item) => (
                    <li key={item.id}>
                      <button
                        type="button"
                        className="warung-decor-item"
                        aria-pressed={selected?.id === item.id}
                        disabled={pending}
                        onClick={() => {
                          setSelection((current) => ({ ...current, [slot]: item.id }));
                          setActionError("");
                          setNotice("");
                        }}
                      >
                        <span className="warung-decor-thumb">
                          <DecorArt item={item} />
                          {selected?.id === item.id && (
                            <span className="warung-decor-selected" aria-hidden="true">
                              <Check size={17} strokeWidth={3} />
                            </span>
                          )}
                          {!isOwned(item) && w.level < item.level && (
                            <span
                              className="warung-decor-lock"
                              aria-label={`Butuh level ${item.level}`}
                            >
                              <LockKeyhole size={13} /> Lv.{item.level}
                            </span>
                          )}
                        </span>
                        <span className="warung-decor-item-label">
                          <strong>{item.name}</strong>
                          <small data-owned={isOwned(item) || undefined}>
                            {isActive(item) ? (
                              <>
                                <Check size={12} aria-hidden /> Dipakai
                              </>
                            ) : isOwned(item) ? (
                              "Dimiliki"
                            ) : (
                              <>
                                <KasMoneyIcon />
                                {rupiah(item.price)}
                              </>
                            )}
                          </small>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="warung-decor-empty">
                  <Sparkles size={36} aria-hidden />
                  <h3>Belum ada pilihan {group.title.toLowerCase()}</h3>
                  <p>Pilih bagian lain untuk melihat dekorasi warung.</p>
                </div>
              )}
            </section>
          </div>
        </div>
      </section>
    </>
  );
}
