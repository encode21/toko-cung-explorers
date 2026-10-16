import { AppearanceStudio } from "./AppearanceStudio";
import { AppearanceSectionIcon } from "./AppearanceSectionIcon";
import { AppearanceEmotes } from "./AppearanceEmotes";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import {
  Grid2X2,
  Shirt,
  SlidersHorizontal,
  ShoppingBag,
  Footprints,
  Glasses,
  Headphones,
  Backpack,
  Sparkles,
  HatGlasses,
} from "lucide-react";
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
function PointPrice({ amount }: { amount: number }) {
  return (
    <span
      className="appearance-point-price"
      role="img"
      aria-label={`${amount.toLocaleString("id-ID")} Point`}
    >
      <PointCoinIcon />
      <span>{amount.toLocaleString("id-ID")}</span>
    </span>
  );
}

export function ExplorerWardrobe({
  onBack,
  initialSection = "closet",
}: {
  onBack: () => void;
  initialSection?: "look" | "closet" | "shop";
}) {
  const profile = useProfile((s) => s.profile),
    draft = useProfile((s) => s.appearanceDraft),
    store = useWardrobe();
  const [mode, setMode] = useState<"customize" | "shop">(
    initialSection === "shop" ? "shop" : "customize",
  );
  const [section, setSection] = useState<"look" | "closet" | "emotes">(
    initialSection === "look" ? "look" : "closet",
  );
  const [previewAnimation, setPreviewAnimation] = useState<string | undefined>();
  const [category, setCategory] = useState<WardrobeSlot | "set" | "all">("all");
  const [selected, setSelected] = useState<WardrobeItem | null>(null),
    [confirm, setConfirm] = useState<{
      item: WardrobeItem;
      requestId: string;
      balance: number;
    } | null>(null),
    [message, setMessage] = useState(""),
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
    setMessage(
      mode === "shop"
        ? "Dipakai pada draft. Buka Sesuaikan lalu Simpan."
        : "Dipakai pada draft. Tekan Simpan untuk menyimpan.",
    );
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
    (item) => (category === "all" || item.slot === category) && (mode === "shop" || owned(item)),
  );
  const purchaseUnavailable =
    !selected ||
    !synced ||
    store.loading ||
    !!store.error ||
    saving ||
    store.busy ||
    owned(selected) ||
    store.balance < selected.price;
  const purchaseHint = !selected
    ? "Pilih item yang ingin dibeli."
    : !synced || store.loading || store.error
      ? "Menunggu katalog dan saldo tersambung."
      : owned(selected)
        ? "Sudah dimiliki. Simpan penampilan melalui tab Sesuaikan."
        : store.balance < selected.price
          ? "Point belum cukup untuk item ini."
          : `${selected.label} siap dibeli.`;
  const requestPurchase = () => {
    if (purchaseUnavailable || !selected) return;
    setConfirm({ item: selected, requestId: crypto.randomUUID(), balance: store.balance });
  };
  const trial = JSON.stringify(appearance) !== JSON.stringify(equipped.current);
  return (
    <>
      <AppearanceStudio
        onBack={cancel}
        backLabel={
          initialSection === "shop"
            ? "Tutup toko"
            : initialSection === "look"
              ? "Tutup penampilan"
              : "Kembali ke profil"
        }
        busy={saving || store.busy}
        onReset={() => {
          useProfile.getState().resetAppearance();
          equipped.current = normalizeExplorer(
            useProfile.getState().appearanceDraft?.explorer ?? DEFAULT_EXPLORER,
          );
          setSelected(null);
          setPreviewAnimation(undefined);
          previousSet.current = null;
          setMessage("Penampilan dikembalikan ke yang terakhir disimpan.");
        }}
        title={selected?.label ?? "Buatlah karakter yang"}
        subtitle={
          selected
            ? trial
              ? "Coba gayamu sebelum dipakai."
              : "Penampilan pilihanmu."
            : "sesuai dengan dirimu!"
        }
        preview={
          <Suspense fallback={<p>Memuat karakter…</p>}>
            <AvatarPreview avatar={draft} animation={previewAnimation} />
          </Suspense>
        }
        navigation={
          <nav className="appearance-tabs" aria-label="Kustomisasi">
            {(
              [
                ["customize", "Sesuaikan", SlidersHorizontal],
                ["shop", "Toko", ShoppingBag],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                type="button"
                key={id}
                aria-pressed={mode === id}
                disabled={saving || store.busy}
                onClick={() => {
                  setMode(id);
                  setSelected(null);
                  setPreviewAnimation(undefined);
                  set(equipped.current);
                  setMessage("");
                }}
              >
                <Icon aria-hidden />
                <span>{label}</span>
              </button>
            ))}
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
                aria-pressed={mode === "customize" && section === id}
                disabled={saving || store.busy}
                onClick={() => {
                  setMode("customize");
                  setSection(id);
                  setSelected(null);
                  setPreviewAnimation(undefined);
                  set(equipped.current);
                  setMessage("");
                }}
              >
                <AppearanceSectionIcon section={id} />
              </button>
            ))}
          </nav>
        }
        stageAction={
          mode === "customize" ? (
            <button
              type="button"
              className="appearance-stage-save"
              onClick={() => void save()}
              disabled={saving || store.busy || !synced || !!store.error}
            >
              {saving ? "Menyimpan…" : "Simpan"}
            </button>
          ) : undefined
        }
        footer={
          mode === "shop" ? (
            <>
              <div className="appearance-footer-item">
                {selected ? <strong>{selected.label}</strong> : null}
                <small id="appearance-purchase-hint">{purchaseHint}</small>
              </div>
              <div className="appearance-footer-actions">
                {selected && (
                  <>
                    <Button onClick={() => select(selected)}>Coba</Button>
                    {owned(selected) && (
                      <>
                        <Button disabled={!synced || !!store.error} onClick={equip}>
                          Pakai
                        </Button>
                        {worn(selected) && <Button onClick={remove}>Lepas</Button>}
                      </>
                    )}
                  </>
                )}
                <Button
                  className="appearance-buy-button"
                  aria-describedby="appearance-purchase-hint"
                  onClick={requestPurchase}
                  disabled={purchaseUnavailable}
                >
                  <PointCoinIcon className="appearance-buy-coin" />
                  Beli
                </Button>
              </div>
            </>
          ) : selected ? (
            <>
              <div className="appearance-footer-item">
                <strong>{selected.label}</strong>
                <small>
                  {conflict.length
                    ? `Akan melepas: ${conflict.join(", ")}.`
                    : trial
                      ? "Tekan Pakai untuk memakai item yang sedang dicoba."
                      : selected.preset
                        ? "Set mengganti kombinasi seluruh slot; Lepas mengembalikan sebelumnya."
                        : "Coba dulu, lalu Pakai bila cocok."}
                </small>
              </div>
              <div className="appearance-footer-actions">
                <Button onClick={() => select(selected)}>Coba</Button>
                {owned(selected) ? (
                  <>
                    <Button disabled={!synced || !!store.error} onClick={equip}>
                      Pakai
                    </Button>
                    {worn(selected) && <Button onClick={remove}>Lepas</Button>}
                  </>
                ) : null}
              </div>
            </>
          ) : undefined
        }
      >
        <div className="appearance-wardrobe-options">
          {mode === "customize" && section === "emotes" ? (
            <AppearanceEmotes animation={previewAnimation} onChange={setPreviewAnimation} />
          ) : mode === "customize" && section === "look" ? (
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
              <p>
                Wajah dan proporsi Explorer dipertahankan. Warna kulit terpisah dari Set outfit.
              </p>
            </div>
          ) : (
            <>
              <nav className="appearance-categories" aria-label="Kategori kosmetik">
                {(["all", ...Object.keys(SLOT_LABELS)] as (WardrobeSlot | "set" | "all")[]).map(
                  (id) => {
                    const Icon =
                      id === "all"
                        ? Grid2X2
                        : id === "top" || id === "bottom" || id === "set"
                          ? Shirt
                          : id === "footwear"
                            ? Footprints
                            : id === "eyewear"
                              ? Glasses
                              : id === "audio"
                                ? Headphones
                                : id === "back"
                                  ? Backpack
                                  : id === "headwear"
                                    ? HatGlasses
                                    : Sparkles;
                    const label = id === "all" ? "Semua" : SLOT_LABELS[id];
                    return (
                      <button
                        key={id}
                        type="button"
                        aria-label={label}
                        aria-pressed={category === id}
                        onClick={() => {
                          setCategory(id);
                          setSelected(null);
                          set(equipped.current);
                        }}
                      >
                        <Icon aria-hidden />
                        <span>{label}</span>
                      </button>
                    );
                  },
                )}
              </nav>
              <div className="wardrobe-scroll wardrobe-grid">
                {store.loading ? (
                  <p>Memuat koleksi…</p>
                ) : cards.length ? (
                  cards.map((item) => (
                    <button
                      className="wardrobe-card appearance-item"
                      key={item.id}
                      aria-label={`Coba ${item.label}`}
                      aria-pressed={selected?.id === item.id}
                      onClick={() => select(item)}
                    >
                      <span className="appearance-item-art">
                        <img
                          loading="lazy"
                          src={`/assets/wardrobe/${item.id}.png`}
                          alt={item.label}
                        />
                        {mode === "shop" && synced && owned(item) && (
                          <span className="appearance-owned-ribbon">Dimiliki</span>
                        )}
                      </span>
                      <strong>{item.label}</strong>
                      {!synced ? (
                        <span className="appearance-item-status">Pratinjau</span>
                      ) : owned(item) ? (
                        worn(item) && <span className="appearance-item-status">Dipakai</span>
                      ) : (
                        <PointPrice amount={item.price} />
                      )}
                    </button>
                  ))
                ) : (
                  <p>
                    Belum ada item di kategori ini.{" "}
                    {mode === "customize" ? "Lihat pilihan di Toko." : "Pilih kategori lainnya."}
                  </p>
                )}
              </div>
            </>
          )}
          {(store.error || message) && (
            <p className="wardrobe-status" data-error={!!store.error} role="status">
              {store.error
                ? "Koleksi dan saldo belum tersinkron. Item tetap bisa dicoba. "
                : message}
              {store.error && !store.busy && (
                <button onClick={() => void store.load()}> Muat ulang</button>
              )}
            </p>
          )}
        </div>
      </AppearanceStudio>
      {confirm && (
        <GameModal
          title="Konfirmasi pembelian"
          className="appearance-purchase-modal"
          onClose={() => {
            if (!store.busy) setConfirm(null);
          }}
        >
          <div>
            <h3>Beli {confirm.item.label}?</h3>
            <p>
              Harga: <PointPrice amount={confirm.item.price} />
            </p>
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
                  setMessage(
                    "Dimiliki. Tekan Pakai, lalu buka Sesuaikan untuk menyimpan penampilan.",
                  );
                }
              }}
            >
              {store.busy ? "Memproses…" : "Konfirmasi beli"}
            </Button>
          </div>
        </GameModal>
      )}
    </>
  );
}
