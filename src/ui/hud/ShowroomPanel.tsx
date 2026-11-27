import { useCallback, useEffect, useState } from "react";
import { Check, ShoppingCart } from "lucide-react";
import { useGarasi } from "@/game/garasi/store";
import { SHOWROOM_NAME } from "@/game/showroom/layout";
import { isShowroomModel, showroomVehicleImage, SHOWROOM_MODELS } from "@/game/showroom/models";
import {
  loadShowroomCatalog,
  purchaseShowroomVehicle,
  useShowroomShop,
} from "@/game/showroom/shop";
import { rupiah } from "@/game/warung/model";
import { createId } from "@/lib/id";
import { useHud } from "@/state/hud-store";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { ShowroomVehiclePreview } from "./ShowroomVehiclePreview";
import "./showroom-panel.css";

export function ShowroomPanel() {
  const [selected, setSelected] = useState(useShowroomShop.getState().selected);
  const [quoteState, setQuoteState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [order, setOrder] = useState<string | null>(null);
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState("");
  const { data, busy, error } = useGarasi();
  const setSheet = useHud((s) => s.setSheet);
  const refresh = useCallback(async () => {
    setQuoteState("loading");
    const snapshot = await loadShowroomCatalog();
    setQuoteState(snapshot ? "ready" : "unavailable");
  }, []);
  useEffect(() => void refresh(), [refresh]);

  const loaded = quoteState !== "loading";
  const catalog = quoteState === "ready" ? data?.catalog.showroom : undefined;
  const offer = catalog?.find((item) => item.id === selected);
  const model = SHOWROOM_MODELS[selected];
  const cash = quoteState === "ready" ? data?.garasi.cash : null;
  const owned =
    catalog &&
    data?.garasi.owned.some((item) => item.kind === "showroom" && item.itemId === selected);
  const canBuy = !busy && !!offer && cash != null && cash >= offer.price && !owned;

  async function confirmPurchase() {
    if (!canBuy || !order || buying || !offer) return;
    setBuying(true);
    try {
      if (await purchaseShowroomVehicle(selected, order)) {
        setNotice(`${offer.name} sudah masuk Garasi.`);
        setOrder(null);
      }
    } finally {
      setBuying(false);
    }
  }

  return (
    <GameModal
      title={SHOWROOM_NAME}
      className="game-light showroom-shop"
      bodyClassName="game-scroll-flush"
      onClose={() => {
        if (!buying) setSheet(null);
      }}
      headerAccessory={
        cash != null && (
          <span className="showroom-shop-cash">
            <KasMoneyIcon className="warung-kas-icon" />
            <span>
              Kas usaha <strong>{rupiah(cash)}</strong>
            </span>
          </span>
        )
      }
      footer={
        <div className="showroom-shop-footer">
          <div className="showroom-shop-feedback" aria-live="polite">
            {notice ||
              (order && offer
                ? `Bayar ${rupiah(offer.price)} dari Kas usaha?`
                : offer && !owned && cash != null && cash < offer.price
                  ? `Kas usaha kurang ${rupiah(offer.price - cash)}.`
                  : "")}
          </div>
          {order ? (
            <>
              <GameButton
                className="game-button-soft"
                disabled={buying}
                onClick={() => setOrder(null)}
              >
                Batal
              </GameButton>
              <GameButton disabled={!canBuy || buying} onClick={() => void confirmPurchase()}>
                {buying ? "Memproses…" : "Konfirmasi beli"}
              </GameButton>
            </>
          ) : owned ? (
            <GameButton onClick={() => setSheet("garasi")} disabled={busy}>
              Buka Garasi
            </GameButton>
          ) : offer && data?.garasi.hasWarung ? (
            <GameButton onClick={() => setOrder(createId())} disabled={!canBuy}>
              <ShoppingCart size={17} aria-hidden /> Beli
            </GameButton>
          ) : offer ? (
            <GameButton onClick={() => setSheet("warung")}>Buka Warungku</GameButton>
          ) : loaded ? (
            <GameButton disabled={busy} onClick={() => void refresh()}>
              Coba lagi
            </GameButton>
          ) : null}
        </div>
      }
    >
      <div className="showroom-shop-layout">
        <nav className="showroom-shop-models" aria-label="Koleksi Cung Motor">
          {Object.keys(SHOWROOM_MODELS)
            .filter(isShowroomModel)
            .map((id) => {
              const item = catalog?.find((candidate) => candidate.id === id);
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected === id}
                  disabled={buying}
                  className="showroom-shop-choice"
                  onClick={() => {
                    setSelected(id);
                    setOrder(null);
                    setNotice("");
                  }}
                >
                  <img src={showroomVehicleImage(id)} alt="" width={108} height={64} />
                  <span>
                    <strong>{SHOWROOM_MODELS[id].name}</strong>
                    {item && <small>{rupiah(item.price)}</small>}
                  </span>
                </button>
              );
            })}
        </nav>
        <section className="showroom-shop-detail" aria-label={model.name}>
          <ShowroomVehiclePreview model={selected} />
          <div className="showroom-shop-info">
            <div>
              <h3>{model.name}</h3>
              <p>{model.category} · 2 kursi</p>
              {offer?.blurb && <p className="showroom-shop-blurb">{offer.blurb}</p>}
            </div>
            {owned ? (
              <span className="showroom-shop-owned">
                <Check size={15} aria-hidden /> Dimiliki
              </span>
            ) : offer ? (
              <strong className="showroom-shop-price">{rupiah(offer.price)}</strong>
            ) : null}
          </div>
          {error && loaded ? (
            <p className="showroom-shop-status" role="alert">
              {error}
            </p>
          ) : !loaded ? (
            <p className="showroom-shop-status" role="status">
              Memuat koleksi…
            </p>
          ) : !offer ? (
            <p className="showroom-shop-status" role="status">
              Katalog belum tersedia.
            </p>
          ) : !data?.garasi.hasWarung ? (
            <p className="showroom-shop-status">Buka warung untuk membeli dengan Kas usaha.</p>
          ) : null}
        </section>
      </div>
    </GameModal>
  );
}
