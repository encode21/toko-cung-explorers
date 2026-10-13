import { lazy, Suspense, useEffect, useRef, useState } from "react";
import { useProfile } from "@/identity/profile-store";
import { useWardrobe } from "@/identity/wardrobe-store";
import {
  DEFAULT_EXPLORER,
  equipExplorer,
  normalizeExplorer,
  type ExplorerAppearance,
} from "@/identity/explorer";
import {
  WARDROBE,
  SLOT_LABELS,
  WARDROBE_SLOTS,
  itemOwned,
  type WardrobeItem,
  type WardrobeSlot,
} from "@/identity/wardrobe";
import { HAIR_COLORS, SKIN_TONES, OUTFIT_COLORS } from "@/identity/avatar";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
const AvatarPreview = lazy(() => import("@/game/avatar/AvatarPreview"));
const colorLabels = {
  skin: "Warna kulit",
  hair: "Warna rambut",
  jacket: "Warna atasan",
  trim: "Detail",
  pants: "Warna bawahan",
  shoes: "Warna alas kaki",
  backpack: "Warna tas",
};
function tryItem(appearance: ExplorerAppearance, item: WardrobeItem): ExplorerAppearance {
  return item.preset
    ? normalizeExplorer({
        ...appearance,
        ...item.preset,
        colors: { ...appearance.colors, ...item.colors },
      })
    : equipExplorer(appearance, item.slot as WardrobeSlot, item.id);
}
export function ExplorerWardrobe({ onBack }: { onBack: () => void }) {
  const profile = useProfile((s) => s.profile),
    draft = useProfile((s) => s.appearanceDraft),
    store = useWardrobe();
  const [section, setSection] = useState<"look" | "closet" | "shop">("closet"),
    [category, setCategory] = useState<WardrobeSlot | "set">("top"),
    [search, setSearch] = useState(""),
    [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState<WardrobeItem | null>(null),
    [confirm, setConfirm] = useState<{
      item: WardrobeItem;
      requestId: string;
      balance: number;
    } | null>(null),
    [message, setMessage] = useState(""),
    [camera, setCamera] = useState(0),
    [saving, setSaving] = useState(false);
  const previousSet = useRef<ExplorerAppearance | null>(null),
    equipped = useRef<ExplorerAppearance>(DEFAULT_EXPLORER);
  useEffect(() => {
    useProfile.getState().beginAppearanceEdit();
    equipped.current = normalizeExplorer(
      useProfile.getState().profile?.avatar.explorer ?? DEFAULT_EXPLORER,
    );
    void useWardrobe.getState().load();
    return () => useProfile.getState().endAppearanceEdit();
  }, []);
  if (!profile || !draft) return null;
  const appearance = normalizeExplorer(draft.explorer ?? DEFAULT_EXPLORER);
  const set = (a: ExplorerAppearance) => useProfile.getState().updateAppearance("explorer", a);
  const cancel = () => {
    useProfile.getState().endAppearanceEdit();
    onBack();
  };
  const synced = store.catalog.length > 0;
  const owned = (item: WardrobeItem) => itemOwned(item, store.owned, store.catalog);
  const worn = (item: WardrobeItem) =>
    item.preset
      ? Object.entries(item.preset).every(([s, id]) => equipped.current[s as WardrobeSlot] === id)
      : equipped.current[item.slot as WardrobeSlot] === item.id;
  const select = (item: WardrobeItem) => {
    setSelected(item);
    set(tryItem(equipped.current, item));
    setMessage("Sedang mencoba. Belum dipakai atau disimpan.");
  };
  const equip = () => {
    if (!selected || !owned(selected)) return;
    if (selected.preset)
      previousSet.current = { ...equipped.current, colors: { ...equipped.current.colors } };
    const next = tryItem(equipped.current, selected);
    equipped.current = next;
    set(next);
    setMessage("Dipakai pada draft. Tekan Simpan untuk menyimpan.");
  };
  const remove = () => {
    if (!selected) return;
    let next: ExplorerAppearance;
    if (selected.preset) {
      next = previousSet.current ?? normalizeExplorer(DEFAULT_EXPLORER);
      previousSet.current = null;
    } else {
      const slot = selected.slot as WardrobeSlot;
      next = equipExplorer(
        equipped.current,
        slot,
        ["top", "bottom", "footwear"].includes(slot) ? DEFAULT_EXPLORER[slot] : "none",
      );
    }
    equipped.current = next;
    set(next);
    setSelected(null);
  };
  const save = async () => {
    setSaving(true);
    const error = await useProfile
      .getState()
      .save({ avatar: { ...draft, explorer: equipped.current } });
    setSaving(false);
    if (error) setMessage(error);
    else cancel();
  };
  const conflict = selected
    ? WARDROBE_SLOTS.filter(
        (s) =>
          equipped.current[s] !== "none" &&
          s !== selected.slot &&
          tryItem(equipped.current, selected)[s] === "none",
      )
        .map((s) => WARDROBE.find((i) => i.id === equipped.current[s])?.label)
        .filter(Boolean)
    : [];
  const catalog = (synced ? store.catalog : WARDROBE).filter((i) =>
    WARDROBE.some((local) => local.id === i.id),
  );
  const cards = catalog.filter(
    (i) =>
      i.slot === category &&
      i.label.toLocaleLowerCase("id").includes(search.toLocaleLowerCase("id")) &&
      (section !== "closet" || owned(i)) &&
      (filter === "all" || (filter === "owned" ? owned(i) : !owned(i))),
  );
  const trial = JSON.stringify(appearance) !== JSON.stringify(equipped.current);
  return (
    <div className="world-wardrobe">
      <aside className="wardrobe-preview" inert={!!confirm}>
        <div className="wardrobe-preview-actions">
          <Button onClick={cancel} disabled={saving}>
            Batal
          </Button>
          <Button onClick={() => setCamera((v) => v + 1)} aria-label="Reset kamera">
            Reset kamera
          </Button>
        </div>
        <Suspense fallback={<p>Memuat karakter…</p>}>
          <AvatarPreview key={camera} avatar={draft} />
        </Suspense>
        <p>Geser untuk memutar • {trial ? "Preview sementara" : "Penampilan kamu"}</p>
      </aside>
      <section className="wardrobe-main" inert={!!confirm}>
        <header className="wardrobe-header">
          <nav aria-label="Kustomisasi">
            {(
              [
                ["look", "Penampilan"],
                ["closet", "Lemari"],
                ["shop", "Toko"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                aria-pressed={section === id}
                onClick={() => {
                  setSection(id);
                  setSelected(null);
                  set(equipped.current);
                }}
              >
                {label}
              </Button>
            ))}
          </nav>
          <strong aria-label="Saldo poin">
            {synced ? `${store.balance.toLocaleString("id-ID")} P` : "— P"}
          </strong>
        </header>
        {section === "look" ? (
          <div className="wardrobe-scroll wardrobe-colors">
            {Object.entries(colorLabels).map(([key, label]) => (
              <fieldset key={key}>
                <legend>{label}</legend>
                <div>
                  {[
                    ...new Set([
                      DEFAULT_EXPLORER.colors[key as keyof typeof colorLabels],
                      ...(key === "skin"
                        ? SKIN_TONES
                        : key === "hair"
                          ? HAIR_COLORS
                          : OUTFIT_COLORS),
                    ]),
                  ].map((color) => (
                    <button
                      key={color}
                      aria-label={`${label} ${color}`}
                      aria-pressed={appearance.colors[key as keyof typeof colorLabels] === color}
                      style={{ background: color }}
                      onClick={() => {
                        const next = {
                          ...equipped.current,
                          colors: { ...equipped.current.colors, [key]: color },
                        };
                        equipped.current = next;
                        set(next);
                      }}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
            <p>Wajah dan proporsi Explorer dipertahankan. Warna kulit terpisah dari Set outfit.</p>
          </div>
        ) : (
          <>
            <div className="wardrobe-filters">
              <label>
                Cari
                <input
                  aria-label="Cari kosmetik"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Nama item…"
                />
              </label>
              <label>
                Kategori
                <Select
                  value={category}
                  onValueChange={(value) => {
                    setCategory(value as typeof category);
                    setSelected(null);
                    set(equipped.current);
                  }}
                >
                  <SelectTrigger className="wardrobe-select" aria-label="Kategori kosmetik">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent
                    className="wardrobe-select-menu"
                    onEscapeKeyDown={(event) => event.stopPropagation()}
                    position="popper"
                    collisionPadding={12}
                  >
                    {Object.entries(SLOT_LABELS).map(([id, label]) => (
                      <SelectItem key={id} value={id}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </label>
              {section === "shop" && (
                <label>
                  Kepemilikan
                  <Select value={filter} onValueChange={setFilter}>
                    <SelectTrigger className="wardrobe-select" aria-label="Filter kepemilikan">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent
                      className="wardrobe-select-menu"
                      onEscapeKeyDown={(event) => event.stopPropagation()}
                      position="popper"
                      collisionPadding={12}
                    >
                      <SelectItem value="all">Semua</SelectItem>
                      <SelectItem value="owned">Dimiliki</SelectItem>
                      <SelectItem value="unowned">Belum dimiliki</SelectItem>
                    </SelectContent>
                  </Select>
                </label>
              )}
            </div>
            <div className="wardrobe-scroll wardrobe-grid">
              {store.loading ? (
                <p>Memuat koleksi…</p>
              ) : cards.length ? (
                cards.map((item) => (
                  <button
                    className="wardrobe-card"
                    key={item.id}
                    aria-label={`Coba ${item.label}`}
                    aria-pressed={selected?.id === item.id}
                    onClick={() => select(item)}
                  >
                    <img loading="lazy" src={`/assets/wardrobe/${item.id}.png`} alt={item.label} />
                    <strong>{item.label}</strong>
                    <small>{SLOT_LABELS[item.slot]}</small>
                    <span>
                      {worn(item)
                        ? "Dipakai"
                        : !synced
                          ? "Pratinjau"
                          : owned(item)
                            ? "Dimiliki"
                            : `${item.price} P`}
                    </span>
                  </button>
                ))
              ) : (
                <p>
                  Belum ada item di kategori ini.{" "}
                  {section === "closet" ? "Lihat pilihan di Toko." : "Coba ubah filter."}
                </p>
              )}
            </div>
            {selected && (
              <div className="wardrobe-detail">
                <div>
                  <strong>{selected.label}</strong>
                  <p>
                    {conflict.length
                      ? `Akan melepas: ${conflict.join(", ")}.`
                      : selected.preset
                        ? "Set mengganti kombinasi seluruh slot; Lepas mengembalikan kombinasi sebelumnya."
                        : "Coba tidak memotong poin."}
                  </p>
                </div>
                <div>
                  <Button onClick={() => select(selected)}>Coba</Button>
                  {owned(selected) ? (
                    <>
                      <Button disabled={!synced || !!store.error} onClick={equip}>
                        Pakai
                      </Button>
                      {worn(selected) && <Button onClick={remove}>Lepas</Button>}
                    </>
                  ) : (
                    <Button
                      disabled={
                        !synced || !!store.error || store.busy || store.balance < selected.price
                      }
                      onClick={() =>
                        setConfirm({
                          item: selected,
                          requestId: crypto.randomUUID(),
                          balance: store.balance,
                        })
                      }
                    >
                      {!synced
                        ? "Menunggu koneksi"
                        : store.balance < selected.price
                          ? "Poin Tidak Cukup"
                          : `Beli · ${selected.price} P`}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
        {(store.error || message) && (
          <p className="wardrobe-status" data-error={!!store.error} role="status">
            {store.error ? "Koleksi dan saldo belum tersinkron. Item tetap bisa dicoba. " : message}
            {store.error && !store.busy && (
              <button onClick={() => void store.load()}> Muat ulang</button>
            )}
          </p>
        )}
      </section>
      <footer className="wardrobe-footer" inert={!!confirm}>
        <small>
          {trial
            ? "Preview belum dipakai. Simpan hanya menyimpan item yang dipakai."
            : "Pembelian tetap dimiliki meski penampilan dibatalkan."}
        </small>
        <Button
          onClick={() => {
            equipped.current = normalizeExplorer(DEFAULT_EXPLORER);
            set(equipped.current);
            setSelected(null);
            previousSet.current = null;
            setMessage("Reset hanya mengubah penampilan draft.");
          }}
          disabled={saving}
        >
          Reset
        </Button>
        <Button
          onClick={() => void save()}
          disabled={saving || store.busy || !synced || !!store.error}
        >
          {saving ? "Menyimpan…" : "Simpan"}
        </Button>
      </footer>
      {confirm && (
        <div
          className="wardrobe-confirm"
          role="dialog"
          aria-modal="true"
          aria-label="Konfirmasi pembelian"
        >
          <div>
            <h3>Beli {confirm.item.label}?</h3>
            <p>Harga: {confirm.item.price} P</p>
            <p>
              Saldo sekarang: {confirm.balance} P → Setelah pembelian:{" "}
              {confirm.balance - confirm.item.price} P
            </p>
            <p>Pembelian tetap masuk koleksi meskipun penampilan dibatalkan.</p>
            {store.error && (
              <p role="alert">{store.error} Permintaan yang sama aman dicoba lagi.</p>
            )}
            <Button disabled={store.busy} onClick={() => setConfirm(null)}>
              Batal
            </Button>
            <Button
              autoFocus
              disabled={store.busy}
              onClick={async () => {
                if (await store.buy(confirm.item, confirm.requestId)) {
                  setConfirm(null);
                  setMessage("Dimiliki. Tekan Pakai lalu Simpan untuk mengenakannya.");
                }
              }}
            >
              {store.busy ? "Memproses…" : "Konfirmasi beli"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
