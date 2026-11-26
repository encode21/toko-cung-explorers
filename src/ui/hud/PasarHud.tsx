import { useState, type ReactNode } from "react";
import { LoaderCircle, ShoppingBasket, Zap } from "lucide-react";
import { sellFish, sellFruit, useEasyJobs } from "@/game/easyjobs/store";
import { kioskById, type Kiosk, type MenuItem } from "@/game/pasar/model";
import { buyFood, closePasar, usePasar } from "@/game/pasar/store";
import { rupiah } from "@/game/warung/model";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { FishIcon } from "./FishIcon";
import { PasarItemArt } from "./PasarItemArt";
import { WarungKasBalance } from "./WarungKasBalance";
import "./pasar.css";

type CatalogEntry =
  | { key: string; kind: "buy"; item: MenuItem }
  | { key: "sell-fruit"; kind: "sell-fruit" }
  | { key: "sell-fish"; kind: "sell-fish" };

const entryName = (entry: CatalogEntry) => {
  if (entry.kind === "buy") return entry.item.name;
  return entry.kind === "sell-fruit" ? "Keranjang buah" : "Hasil pancing";
};

const entryArt = (entry: CatalogEntry) => (entry.kind === "buy" ? entry.item.id : entry.kind);

/** Kiosk catalog: choose on the left, inspect and complete one clear action on the right. */
export function PasarHud() {
  const open = usePasar((state) => state.open);
  const purchaseBusy = usePasar((state) => state.busy);
  const kiosk = open ? kioskById(open) : null;
  if (!kiosk) return null;

  return <PasarCatalog key={kiosk.id} kiosk={kiosk} purchaseBusy={purchaseBusy} />;
}

function PasarCatalog({ kiosk, purchaseBusy }: { kiosk: Kiosk; purchaseBusy: boolean }) {
  const jobs = useEasyJobs();
  const canSell = kiosk.id === "buah" || kiosk.id === "ikan";
  const fruitCount = Object.values(jobs.basket).reduce((total, count) => total + count, 0);
  const fishCount = jobs.fishBag.length;
  const fishValue = jobs.fishBag.reduce((total, price) => total + price, 0);
  const entries: CatalogEntry[] = kiosk.menu.map((item) => ({
    key: "buy:" + item.id,
    kind: "buy",
    item,
  }));

  if (kiosk.id === "buah") entries.push({ key: "sell-fruit", kind: "sell-fruit" });
  if (kiosk.id === "ikan") entries.push({ key: "sell-fish", kind: "sell-fish" });

  const [selectedKey, setSelectedKey] = useState(entries[0]?.key ?? "");
  const selected = entries.find((entry) => entry.key === selectedKey) ?? entries[0];
  if (!selected) return null;

  const busy = purchaseBusy || jobs.busy;
  const emptySale =
    (selected.kind === "sell-fruit" && fruitCount === 0) ||
    (selected.kind === "sell-fish" && fishCount === 0);
  const actionAriaLabel = busy
    ? "Memproses transaksi"
    : selected.kind === "buy"
      ? "Beli " + selected.item.name + " seharga " + rupiah(selected.item.price)
      : selected.kind === "sell-fruit"
        ? fruitCount
          ? "Jual " + fruitCount + " buah"
          : "Belum ada buah untuk dijual"
        : fishCount
          ? "Jual semua ikan seharga " + rupiah(fishValue)
          : "Belum ada ikan untuk dijual";

  const submit = () => {
    if (selected.kind === "buy") {
      void buyFood(kiosk.id, selected.item);
      return;
    }
    if (selected.kind === "sell-fruit") void sellFruit();
    else void sellFish();
  };

  return (
    <GameModal
      title={kiosk.name}
      subtitle={
        canSell
          ? "Beli makanan atau jual hasil · transaksi memakai Kas usaha"
          : "Beli makanan · transaksi memakai Kas usaha"
      }
      headerAccessory={<WarungKasBalance />}
      className="game-light pasar-modal"
      bodyClassName="pasar-modal-body"
      onClose={closePasar}
    >
      <div className="pasar-catalog" data-pasar>
        <section className="pasar-catalog-list" aria-label={"Pilihan di " + kiosk.name}>
          <header className="pasar-list-heading">
            <h3>Pilih menu</h3>
            <span>{kiosk.menu.length} pilihan</span>
          </header>

          <div className="pasar-list-scroll">
            <div className="pasar-list-group" aria-label="Menu makanan">
              {entries
                .filter((entry) => entry.kind === "buy")
                .map((entry) => (
                  <CatalogButton
                    key={entry.key}
                    entry={entry}
                    selected={entry.key === selected.key}
                    disabled={busy}
                    meta={
                      entry.kind === "buy"
                        ? rupiah(entry.item.price) + " · +" + entry.item.energy + " energi"
                        : ""
                    }
                    onSelect={() => setSelectedKey(entry.key)}
                  />
                ))}
            </div>

            {entries.some((entry) => entry.kind !== "buy") && (
              <div className="pasar-list-group pasar-sale-group" aria-label="Jual hasil">
                <h4>Jual hasil</h4>
                {entries
                  .filter((entry) => entry.kind !== "buy")
                  .map((entry) => (
                    <CatalogButton
                      key={entry.key}
                      entry={entry}
                      selected={entry.key === selected.key}
                      disabled={busy}
                      meta={
                        entry.kind === "sell-fruit"
                          ? fruitCount
                            ? fruitCount + " buah siap dijual"
                            : "Belum ada buah"
                          : fishCount
                            ? fishCount + " ikan · " + rupiah(fishValue)
                            : "Belum ada ikan"
                      }
                      onSelect={() => setSelectedKey(entry.key)}
                    />
                  ))}
              </div>
            )}
          </div>
        </section>

        <section className="pasar-detail" aria-live="polite">
          <div className="pasar-detail-scroll">
            <header className="pasar-detail-heading">
              <div>
                <h3>{entryName(selected)}</h3>
                <p>{detailDescription(selected, kiosk.vendor)}</p>
              </div>
              {selected.kind === "buy" && (
                <span
                  className="pasar-energy-badge"
                  aria-label={"Memulihkan " + selected.item.energy + " energi"}
                >
                  <Zap aria-hidden />
                  <strong>+{selected.item.energy}</strong>
                </span>
              )}
            </header>

            <div className="pasar-art-stage">
              <PasarItemArt id={entryArt(selected)} size={164} className="pasar-hero-art" />
            </div>

            {selected.kind === "sell-fruit" && (
              <SaleSummary
                icon={<ShoppingBasket aria-hidden />}
                title={fruitCount ? fruitCount + " buah di keranjang" : "Keranjang masih kosong"}
                text={
                  fruitCount
                    ? "Semua buah akan dijual dalam satu transaksi."
                    : "Petik buah lebih dulu, lalu kembali ke kios ini untuk menjualnya."
                }
              />
            )}

            {selected.kind === "sell-fish" && (
              <>
                <SaleSummary
                  icon={<FishIcon id={jobs.fishIds[0] ?? null} className="pasar-summary-fish" />}
                  title={fishCount ? fishCount + " ikan siap dijual" : "Belum ada hasil pancing"}
                  text={
                    fishCount
                      ? "Nilai seluruh tangkapan " + rupiah(fishValue) + "."
                      : "Tangkap ikan lebih dulu, lalu kembali ke kios ini untuk menjualnya."
                  }
                />
                {fishCount > 0 && (
                  <div className="pasar-fish-preview" aria-label="Tangkapan yang akan dijual">
                    {jobs.fishBag.slice(0, 5).map((price, index) => (
                      <span key={(jobs.fishIds[index] ?? "fish") + "-" + index}>
                        <FishIcon id={jobs.fishIds[index] ?? null} />
                        <small>{rupiah(price)}</small>
                      </span>
                    ))}
                    {fishCount > 5 && <b>+{fishCount - 5}</b>}
                  </div>
                )}
              </>
            )}
            <GameButton
              className="pasar-primary-action"
              disabled={busy || emptySale}
              aria-label={actionAriaLabel}
              onClick={submit}
            >
              {busy ? (
                <>
                  <LoaderCircle className="pasar-action-spinner" aria-hidden />
                  <strong>Memproses…</strong>
                </>
              ) : (
                <>
                  {selected.kind === "sell-fruit" ? (
                    <ShoppingBasket className="pasar-button-sale-icon" aria-hidden />
                  ) : (
                    <KasMoneyIcon className="pasar-button-money-icon" />
                  )}
                  <strong>
                    {selected.kind === "buy"
                      ? rupiah(selected.item.price)
                      : selected.kind === "sell-fruit"
                        ? fruitCount
                          ? "Jual " + fruitCount + " buah"
                          : "Belum ada buah"
                        : fishCount
                          ? rupiah(fishValue)
                          : "Belum ada ikan"}
                  </strong>
                </>
              )}
            </GameButton>
          </div>
        </section>
      </div>
    </GameModal>
  );
}

function CatalogButton({
  entry,
  selected,
  disabled,
  meta,
  onSelect,
}: {
  entry: CatalogEntry;
  selected: boolean;
  disabled: boolean;
  meta: string;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      className="pasar-list-item"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onSelect}
    >
      <PasarItemArt id={entryArt(entry)} size={52} />
      <span>
        <strong>{entryName(entry)}</strong>
        <small>{meta}</small>
      </span>
      <i aria-hidden />
    </button>
  );
}

function SaleSummary({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="pasar-sale-summary">
      <span>{icon}</span>
      <div>
        <strong>{title}</strong>
        <p>{text}</p>
      </div>
    </div>
  );
}

function detailDescription(entry: CatalogEntry, vendor: string) {
  if (entry.kind === "buy") {
    return "Disiapkan " + vendor + ". Pulihkan " + entry.item.energy + " energi setelah dimakan.";
  }
  if (entry.kind === "sell-fruit") {
    return "Jual semua buah hasil petikmu kepada " + vendor + ".";
  }
  return "Jual semua tangkapanmu kepada " + vendor + ".";
}
