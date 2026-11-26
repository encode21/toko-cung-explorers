import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ChevronRight, LockKeyhole, ShoppingBasket, Trash2 } from "lucide-react";
import { canFundWholesale } from "@/game/gang/economy";
import { KIOSK } from "@/game/interactions/kiosk";
import { basketTotal, kulakanPrice } from "@/game/warung/agen";
import { kioskLine, leaveKioskQueue, useKioskQueue } from "@/game/warung/kiosk-queue";
import { useKioskView } from "@/game/warung/kiosk-view";
import { ProductArt } from "@/game/warung/ProductArt";
import { rupiah } from "@/game/warung/model";
import { addToBasket, deliveryFee, payBasket, useWarung, warungCommand } from "@/game/warung/store";
import { connectionId } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { Kulakan } from "./WarungPanel";
import { WarungKasBalance } from "./WarungKasBalance";
import "./grosir-drawer.css";

export function GrosirDrawer() {
  const data = useWarung((s) => s.data);
  const basket = useWarung((s) => s.basket);
  const busy = useWarung((s) => s.busy);
  const error = useWarung((s) => s.error);
  const recommended = useWarung((s) => s.recommendedRestock);
  const payChoice = useWarung((s) => s.payChoice);
  const since = useKioskQueue((s) => s.since);
  const roster = useNet((s) => s.roster);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [reviewing, setReviewing] = useState(false);
  const [notice, setNotice] = useState("");
  const [now, setNow] = useState(Date.now);
  const strip = useRef<HTMLDivElement>(null);
  const detail = useRef<HTMLDivElement>(null);
  const mounted = useRef(false);
  const shellAnchor = useRef<HTMLSpanElement>(null);
  const basketSummary = useRef<HTMLDivElement>(null);
  const close = () => {
    useWarung.setState({ payChoice: false });
    leaveKioskQueue();
    useHud.getState().setSheet(null);
  };

  useEffect(() => {
    mounted.current = true;
    void warungCommand("read");
    const timer = setInterval(() => {
      setNow(Date.now());
      const [x, , z] = useGame.getState().playerPos;
      if (Math.hypot(x - KIOSK.position[0], z - KIOSK.position[2]) > KIOSK.radius + 2) close();
    }, 1000);
    return () => {
      mounted.current = false;
      clearInterval(timer);
    };
  }, []);
  useEffect(() => {
    detail.current?.scrollTo({ top: 0 });
  }, [reviewing]);

  const w = data?.warung;
  const catalog = data?.catalog ?? [];
  const firstRecommended = catalog.find((item) =>
    recommended?.items.some((line) => line.itemId === item.id),
  );
  const selected = catalog.find((item) => item.id === selectedId) ?? firstRecommended ?? catalog[0];
  const total = basketTotal(basket, data);
  const count = basket.reduce((sum, line) => sum + line.qty, 0);
  const credit = data?.kasbon?.available ?? 0;
  const line = kioskLine(roster, connectionId, since, now);
  const waiting = line.findIndex((player) => player.id === connectionId) > 0;
  useEffect(() => {
    const drawer = shellAnchor.current?.closest<HTMLElement>(".grosir-drawer");
    const world = drawer?.closest<HTMLElement>(".world-viewport");
    if (!drawer || !world) return;
    const measure = () => {
      const frame = world.getBoundingClientRect();
      // offsetWidth excludes the entrance transform, keeping the camera target stable while sliding in.
      const scale = frame.width / (world.offsetWidth || frame.width);
      const sceneWidth = Math.max(0, frame.width - drawer.offsetWidth * scale);
      const basketHeight = basketSummary.current?.getBoundingClientRect().height ?? 0;
      const sceneHeight = Math.max(0, frame.height - basketHeight - 48 * scale);
      useKioskView.setState({ sceneWidth, sceneHeight });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(world);
    observer.observe(drawer);
    if (basketSummary.current) observer.observe(basketSummary.current);
    measure();
    return () => {
      observer.disconnect();
      useKioskView.setState({ sceneWidth: 0, sceneHeight: 0 });
    };
  }, [w?.id, waiting]);
  useEffect(() => {
    strip.current
      ?.querySelector('[aria-pressed="true"]')
      ?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [selected?.id, reviewing, waiting]);
  const have = w?.stock.find((item) => item.itemId === selected?.id)?.qty ?? 0;
  const picked = basket.find((item) => item.itemId === selected?.id)?.qty ?? 0;
  const price = selected ? kulakanPrice(selected, data?.agen) : 0;
  const locked = !!selected && !!w && selected.level > w.level;
  const full = !!w && have + picked + quantity > w.maxStock;
  const affordable = !!w && canFundWholesale(w.cash, credit, total + price * quantity);
  const invalidBasket = basket.some((line) => {
    const item = catalog.find((item) => item.id === line.itemId);
    const stock = w?.stock.find((item) => item.itemId === line.itemId)?.qty ?? 0;
    return !item || !w || item.level > w.level || stock + line.qty > w.maxStock;
  });
  const canPay = !!w && count > 0 && !invalidBasket && canFundWholesale(w.cash, credit, total);

  const addSelected = () => {
    // Read the current basket as well: rapid taps must still respect cash and shelf capacity.
    const state = useWarung.getState();
    const shop = state.data?.warung;
    if (!selected || !shop || state.busy || waiting) return;
    const current = state.basket.find((line) => line.itemId === selected.id)?.qty ?? 0;
    const stock = shop.stock.find((item) => item.itemId === selected.id)?.qty ?? 0;
    if (
      selected.level > shop.level ||
      stock + current + quantity > shop.maxStock ||
      !canFundWholesale(
        shop.cash,
        state.data?.kasbon?.available ?? 0,
        basketTotal(state.basket, state.data) + kulakanPrice(selected, state.data?.agen) * quantity,
      )
    )
      return;
    addToBasket(selected.id, quantity);
    setNotice(
      `${selected.name} ditambah ${quantity} ${selected.uom ?? "pcs"}. Total ${current + quantity} di keranjang.`,
    );
  };
  const checkout = async (mode: "antar" | "ambil") => {
    if (!canPay || busy || waiting) return;
    const ok = await payBasket(mode);
    if (ok && mounted.current && useHud.getState().sheet === "grosir") close();
  };

  return (
    <GameModal
      title="Grosir Toko Cung"
      className="grosir-drawer"
      bodyClassName="grosir-body"
      headerAccessory={<WarungKasBalance />}
      onClose={close}
      footer={
        w && !waiting ? (
          <div ref={basketSummary} className="grosir-world-basket" aria-label="Ringkasan keranjang">
            <div>
              <span>
                <ShoppingBasket size={17} aria-hidden />
                {count} barang
              </span>
              <strong>{rupiah(total)}</strong>
            </div>
            {reviewing ? (
              <button
                type="button"
                className="grosir-primary"
                disabled={busy || !canPay || payChoice}
                onClick={() => void payBasket()}
              >
                {busy ? "Memproses…" : payChoice ? "Pilih pengiriman" : "Lanjut bayar"}
              </button>
            ) : (
              <button
                type="button"
                className="grosir-primary"
                disabled={count === 0}
                onClick={() => setReviewing(true)}
              >
                Keranjang <ChevronRight size={18} aria-hidden />
              </button>
            )}
          </div>
        ) : undefined
      }
    >
      <span ref={shellAnchor} className="grosir-announcement" role="status">
        {notice}
      </span>
      {!data ? (
        <div className="grosir-empty" role="status">
          <p>{error || "Memuat barang grosir…"}</p>
          {error && (
            <button
              type="button"
              className="grosir-primary"
              disabled={busy}
              onClick={() => void warungCommand("read")}
            >
              Coba lagi
            </button>
          )}
        </div>
      ) : !w ? (
        <div className="grosir-content warung-panel">
          <Kulakan />
        </div>
      ) : waiting ? (
        <div className="grosir-empty" role="status">
          <ShoppingBasket size={52} aria-hidden />
          <h3>Antrean ke-{line.findIndex((player) => player.id === connectionId) + 1}</h3>
          <p>{line[0]?.name} sedang memakai kiosk. Pilihan barang akan terbuka saat giliranmu.</p>
          <button type="button" className="grosir-secondary" onClick={close}>
            Keluar antrean
          </button>
        </div>
      ) : (
        <>
          <div ref={detail} className="grosir-content">
            {error && (
              <p className="grosir-error" role="alert">
                {error}
              </p>
            )}
            {reviewing ? (
              <section className="grosir-review" aria-label="Keranjang grosir">
                <button
                  type="button"
                  className="grosir-back"
                  disabled={busy}
                  onClick={() => {
                    setReviewing(false);
                    useWarung.setState({ payChoice: false });
                  }}
                >
                  <ArrowLeft size={18} aria-hidden /> Pilih barang
                </button>
                <h3>Keranjangmu</h3>
                {!basket.length ? (
                  <p>Keranjang masih kosong. Pilih barang untuk mulai belanja.</p>
                ) : (
                  <ul className="grosir-lines">
                    {basket.map((line) => {
                      const item = catalog.find((item) => item.id === line.itemId);
                      return (
                        <li key={line.itemId}>
                          <ProductArt id={line.itemId} size={44} />
                          <div>
                            <strong>{item?.name ?? line.itemId}</strong>
                            <span>
                              {line.qty} {item?.uom ?? "pcs"} ·{" "}
                              {rupiah(item ? kulakanPrice(item, data.agen) * line.qty : 0)}
                            </span>
                          </div>
                          <button
                            type="button"
                            disabled={busy}
                            className="grosir-remove"
                            aria-label={`Hapus ${item?.name ?? line.itemId} dari keranjang`}
                            onClick={() => {
                              addToBasket(line.itemId, -line.qty);
                              useWarung.setState({ payChoice: false });
                            }}
                          >
                            <Trash2 size={18} aria-hidden />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                )}
                {invalidBasket && (
                  <p className="grosir-error">
                    Stok atau akses barang berubah. Hapus barang yang melebihi kapasitas atau belum
                    terbuka.
                  </p>
                )}
                {data.kasbon && (
                  <p className="grosir-credit">
                    {data.kasbon.text["hint"]} · Sisa kasbon {rupiah(credit)}
                  </p>
                )}
                {payChoice && count > 0 && (
                  <div className="grosir-delivery" aria-label="Cara menerima barang">
                    <h4>Dikirim atau bawa sendiri?</h4>
                    <button
                      type="button"
                      className="grosir-primary"
                      disabled={
                        busy ||
                        !canPay ||
                        !canFundWholesale(w.cash, credit, total, deliveryFee(total))
                      }
                      onClick={() => void checkout("antar")}
                    >
                      Antar · {rupiah(total + deliveryFee(total))}
                    </button>
                    <p>Termasuk ongkir {rupiah(deliveryFee(total))}</p>
                    <button
                      type="button"
                      className="grosir-secondary"
                      disabled={busy || !canPay}
                      onClick={() => void checkout("ambil")}
                    >
                      Bawa sendiri · {rupiah(total)}
                    </button>
                  </div>
                )}
              </section>
            ) : selected ? (
              <section className="grosir-product" aria-label="Produk pilihan">
                <div className="grosir-product-image">
                  <ProductArt id={selected.id} size={152} />
                </div>
                <h3>{selected.name}</h3>
                <p className="grosir-unit-price">
                  {rupiah(price)} / {selected.uom ?? "pcs"}
                </p>
                <p className="grosir-stock">
                  {locked
                    ? `Terbuka di level ${selected.level}`
                    : `Stok ${have}/${w.maxStock} · ${picked} di keranjang`}
                </p>
                {recommended?.items.some((line) => line.itemId === selected.id) && (
                  <p className="grosir-credit">Dipesan {recommended.customerName}</p>
                )}
                {!!data.agen?.discountPercent && (
                  <p className="grosir-credit">
                    Harga {w.levelName} · hemat {data.agen.discountPercent}%
                  </p>
                )}
                <div className="grosir-product-actions">
                  <button
                    type="button"
                    className="grosir-multiplier"
                    aria-label={`Jumlah per ketuk: ${quantity}. Ketuk untuk mengganti kelipatan.`}
                    title="Ganti jumlah per ketuk"
                    disabled={busy}
                    onClick={() => setQuantity((current) => (current % 5) + 1)}
                  >
                    ×{quantity}
                  </button>
                  <button
                    type="button"
                    className="grosir-primary grosir-add"
                    disabled={busy || locked || full || !affordable}
                    onClick={addSelected}
                  >
                    <KasMoneyIcon aria-hidden />
                    <span>
                      {locked
                        ? "Belum terbuka"
                        : full
                          ? "Kapasitas rak tidak cukup"
                          : !affordable
                            ? "Kas tidak cukup"
                            : `Tambah ${quantity} · ${rupiah(price * quantity)}`}
                    </span>
                  </button>
                </div>
              </section>
            ) : (
              <div className="grosir-empty">
                <p>Belum ada barang grosir tersedia.</p>
                <button
                  type="button"
                  className="grosir-secondary"
                  disabled={busy}
                  onClick={() => void warungCommand("read")}
                >
                  Muat ulang
                </button>
              </div>
            )}
          </div>
          {!reviewing && catalog.length > 0 && (
            <div className="grosir-catalog">
              <div
                ref={strip}
                className="grosir-product-strip"
                role="group"
                aria-label="Pilih produk grosir"
                onWheel={(event) => {
                  if (Math.abs(event.deltaY) > Math.abs(event.deltaX))
                    event.currentTarget.scrollBy({ left: event.deltaY, behavior: "auto" });
                }}
                onKeyDown={(event) => {
                  if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
                  event.preventDefault();
                  const options = Array.from(
                    event.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
                  );
                  const index = options.indexOf(document.activeElement as HTMLButtonElement);
                  const next =
                    event.key === "Home"
                      ? 0
                      : event.key === "End"
                        ? options.length - 1
                        : Math.max(
                            0,
                            Math.min(
                              options.length - 1,
                              index + (event.key === "ArrowRight" ? 1 : -1),
                            ),
                          );
                  options[next]?.focus();
                  options[next]?.scrollIntoView({ block: "nearest", inline: "nearest" });
                }}
              >
                {catalog.map((item) => {
                  const amount = basket.find((line) => line.itemId === item.id)?.qty ?? 0;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className="grosir-product-option"
                      aria-label={item.name}
                      aria-pressed={selected?.id === item.id}
                      onClick={() => {
                        setSelectedId(item.id);
                        setNotice("");
                      }}
                    >
                      <ProductArt id={item.id} size={64} />
                      <span>{item.name}</span>
                      {item.level > w.level ? (
                        <LockKeyhole
                          className="grosir-product-lock"
                          size={16}
                          aria-label={`Level ${item.level}`}
                        />
                      ) : (
                        amount > 0 && <b className="grosir-product-count">{amount}</b>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </GameModal>
  );
}
