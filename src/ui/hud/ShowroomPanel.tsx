import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import { Box, Camera, CarFront, Check } from "lucide-react";
import { useGarasi, type GarasiItem } from "@/game/garasi/store";
import { SHOWROOM_NAME } from "@/game/showroom/layout";
import { clearShowroomCatalogFrame, setShowroomCatalogFrame } from "@/game/showroom/catalog-camera";
import {
  isShowroomModel,
  regularVehicleImage,
  showroomVehicleImage,
  SHOWROOM_EXHIBITS,
} from "@/game/showroom/models";
import {
  equipShowroomGear,
  loadShowroomCatalog,
  purchaseShowroomItem,
  useShowroomShop,
} from "@/game/showroom/shop";
import { VEHICLE_DEFINITIONS, type VehicleKind } from "@/game/vehicles/definitions";
import { rupiah } from "@/game/warung/model";
import { createId } from "@/lib/id";
import { useHud } from "@/state/hud-store";
import { GameButton } from "@/ui/game-ui/GamePanel";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { HudBalance } from "./HudBalance";
import { ShowroomGearCatalog, type ShowroomGearKind } from "./ShowroomGearCatalog";
import { ShowroomVehiclePreview } from "./ShowroomVehiclePreview";
import { VehicleCollectionScreen } from "./VehicleCollectionScreen";
import "./showroom-panel.css";

type VehicleOffer = {
  id: string;
  kind: "car" | "showroom";
  model: VehicleKind;
  name: string;
  category: string;
  color: string;
  image?: string | undefined;
  item: GarasiItem | undefined;
};

type Purchase = {
  kind: VehicleOffer["kind"] | ShowroomGearKind;
  id: string;
  name: string;
  price: number;
  requestId: string;
};

function regularCar(item: GarasiItem): VehicleOffer {
  const model = item.model;
  return {
    id: item.id,
    kind: "car",
    model: model && Object.hasOwn(VEHICLE_DEFINITIONS, model) ? (model as VehicleKind) : "car",
    name: item.name,
    color: item.color,
    category: "Mobil",
    image: regularVehicleImage(item.id),
    item,
  };
}

export function ShowroomPanel({ gear = false }: { gear?: boolean }) {
  const [selected, setSelected] = useState<string>(useShowroomShop.getState().selected);
  const [quoteState, setQuoteState] = useState<"loading" | "ready" | "unavailable">("loading");
  const [order, setOrder] = useState<Purchase | null>(null);
  const [buying, setBuying] = useState(false);
  const [notice, setNotice] = useState("");
  const [orbitVehicle, setOrbitVehicle] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);
  const [stage, setStage] = useState<HTMLDivElement | null>(null);
  const { data, busy, error } = useGarasi();
  const setSheet = useHud((s) => s.setSheet);
  const refresh = useCallback(async () => {
    setQuoteState("loading");
    const snapshot = await loadShowroomCatalog();
    setQuoteState(snapshot ? "ready" : "unavailable");
  }, []);
  useEffect(() => void refresh(), [refresh]);

  const quote = quoteState === "ready" ? data : null;
  const exhibits = SHOWROOM_EXHIBITS.map<VehicleOffer>(
    ({ id, kind, model, name, category, color }) => ({
      id,
      kind,
      model,
      name,
      category,
      color,
      image: isShowroomModel(id) ? showroomVehicleImage(id) : regularVehicleImage(id),
      item: quote?.catalog[kind]?.find((item) => item.id === id),
    }),
  );
  const otherCars = quote?.catalog.car
    .filter(({ id }) => !exhibits.some((exhibit) => exhibit.id === id))
    .map(regularCar);
  const vehicles = [...exhibits, ...(otherCars ?? [])];
  const vehicle = vehicles.find((item) => item.id === selected) ?? exhibits[0]!;
  const offer = vehicle.item;
  const cash = quote?.garasi.cash;
  const ownsVehicle = ({ kind, id }: VehicleOffer) =>
    quote?.garasi.owned.some((item) => item.kind === kind && item.itemId === id);
  const orderedVehicles = [
    ...vehicles.filter(ownsVehicle),
    ...vehicles.filter((item) => !ownsVehicle(item)),
  ];
  const owned = ownsVehicle(vehicle);
  const canPay = (price: number) =>
    Boolean(quote?.garasi.hasWarung && cash != null && cash >= price);
  const pending = buying || busy;
  const vehicleView = !gear;
  const exhibit = SHOWROOM_EXHIBITS.find(({ id }) => id === vehicle.id);
  const live = vehicleView && Boolean(exhibit) && !compact && orbitVehicle !== vehicle.id;

  useLayoutEffect(() => {
    const viewport = stage?.closest(".world-viewport");
    if (!stage || !viewport) return;
    const measure = () => setCompact(viewport.clientWidth <= 600);
    const observer = new ResizeObserver(measure);
    observer.observe(viewport);
    measure();
    return () => observer.disconnect();
  }, [stage]);

  useLayoutEffect(() => {
    if (!live || !exhibit || !stage) return;
    const measure = () => setShowroomCatalogFrame(exhibit.id, stage);
    const observer = new ResizeObserver(measure);
    observer.observe(stage);
    measure();
    return () => {
      observer.disconnect();
      clearShowroomCatalogFrame();
    };
  }, [exhibit, live, stage]);

  function startPurchase(kind: Purchase["kind"], id: string, name: string, price: number) {
    if (pending || !canPay(price)) return;
    setNotice("");
    setOrder({ kind, id, name, price, requestId: createId() });
  }

  async function confirmPurchase() {
    if (!order || pending || !canPay(order.price)) return;
    setBuying(true);
    try {
      if (await purchaseShowroomItem(order.kind, order.id, order.requestId)) {
        setNotice(
          order.kind === "car" || order.kind === "showroom"
            ? `${order.name} sudah masuk Garasi.`
            : `${order.name} berhasil dibeli dan dipakai.`,
        );
        setOrder(null);
      }
    } finally {
      setBuying(false);
    }
  }

  const vehicleChoices = (vehicles: VehicleOffer[]) =>
    vehicles.map((item) => (
      <button
        key={item.id}
        type="button"
        aria-pressed={vehicle.id === item.id}
        disabled={buying}
        className="showroom-shop-choice"
        onClick={() => {
          setSelected(item.id);
          setOrbitVehicle(null);
          setOrder(null);
          setNotice("");
        }}
      >
        {item.image ? (
          <img src={item.image} alt="" width={108} height={64} />
        ) : (
          <CarFront
            className="showroom-shop-list-car"
            size={27}
            style={{ color: item.color }}
            aria-hidden
          />
        )}
        <span>
          <strong>{item.name}</strong>
          {ownsVehicle(item) ? (
            <small className="showroom-shop-choice-owned">Sudah dimiliki</small>
          ) : (
            item.item && <small>{rupiah(item.item.price)}</small>
          )}
        </span>
      </button>
    ));

  const confirmation = order
    ? `Beli ${order.name} seharga ${rupiah(order.price)} dari Kas usaha?`
    : null;
  const shortfall =
    vehicleView && offer && !owned && cash != null && cash < offer.price
      ? `Kas usaha kurang ${rupiah(offer.price - cash)}.`
      : null;
  const feedback = notice || confirmation || shortfall;
  const actions = (
    <>
      {feedback && (
        <p className="showroom-shop-feedback" aria-live="polite">
          {feedback}
        </p>
      )}
      <div className="showroom-shop-actions">
        {order ? (
          <>
            <GameButton
              className="game-button-soft"
              disabled={buying}
              onClick={() => setOrder(null)}
            >
              Batal
            </GameButton>
            <GameButton
              disabled={pending || !canPay(order.price)}
              onClick={() => void confirmPurchase()}
            >
              <KasMoneyIcon className="showroom-shop-payment-icon" />
              {buying ? "Memproses…" : "Konfirmasi beli"}
            </GameButton>
          </>
        ) : vehicleView && owned ? (
          <GameButton onClick={() => setSheet("garasi")} disabled={pending}>
            Buka Garasi
          </GameButton>
        ) : quote && !quote.garasi.hasWarung ? (
          <GameButton onClick={() => setSheet("warung")}>Buka Warungku</GameButton>
        ) : vehicleView && offer ? (
          <GameButton
            onClick={() => startPurchase(vehicle.kind, vehicle.id, vehicle.name, offer.price)}
            disabled={pending || !canPay(offer.price)}
          >
            <KasMoneyIcon className="showroom-shop-payment-icon" />
            <strong>{rupiah(offer.price)}</strong>
          </GameButton>
        ) : quoteState === "unavailable" ? (
          <GameButton disabled={pending} onClick={() => void refresh()}>
            Coba lagi
          </GameButton>
        ) : null}
      </div>
    </>
  );

  const unavailable = vehicleView && quote && !owned && !offer;
  const status =
    error || !quote || !quote.garasi.hasWarung || unavailable ? (
      <p className="showroom-shop-status" role={error ? "alert" : "status"}>
        {error ??
          (quoteState === "loading"
            ? "Memuat koleksi…"
            : !quote
              ? "Katalog belum tersedia."
              : !quote.garasi.hasWarung
                ? "Buka warung untuk membeli dengan Kas usaha."
                : "Kendaraan ini belum tersedia untuk dibeli.")}
      </p>
    ) : null;

  const cashBadge = cash != null && (
    <div className="showroom-shop-cash">
      <HudBalance kind="kas" value={cash} />
    </div>
  );

  return (
    <VehicleCollectionScreen
      title={gear ? `Perlengkapan ${SHOWROOM_NAME}` : SHOWROOM_NAME}
      className={`showroom-shop${vehicleView ? " showroom-shop--vehicles" : ""}`}
      onClose={() => setSheet(null)}
      closeDisabled={buying}
    >
      {vehicleView ? (
        <div className="showroom-shop-layout">
          <div
            className="showroom-shop-showcase"
            ref={setStage}
            data-showroom-live={live || undefined}
          >
            {!live && (
              <ShowroomVehiclePreview
                model={vehicle.model}
                color={vehicle.color}
                name={vehicle.name}
                image={vehicle.image}
              />
            )}
            {exhibit && !compact && (
              <GameButton
                className="game-button-soft showroom-shop-view"
                onClick={() => setOrbitVehicle(live ? vehicle.id : null)}
              >
                {live ? <Box size={17} aria-hidden /> : <Camera size={17} aria-hidden />}
                {live ? "Putar model" : "Lihat di showroom"}
              </GameButton>
            )}
          </div>
          <div className="showroom-shop-sidebar">
            <div className="showroom-shop-top">
              <strong>{SHOWROOM_NAME}</strong>
              {cashBadge}
            </div>
            <section className="showroom-shop-detail" aria-label={vehicle.name}>
              <div className="showroom-shop-info">
                <h3>{vehicle.name}</h3>
                <div className="showroom-shop-specs">
                  <span>{vehicle.category}</span>
                  <span>{VEHICLE_DEFINITIONS[vehicle.model].seats.length} kursi</span>
                </div>
                {offer?.blurb && <p className="showroom-shop-blurb">{offer.blurb}</p>}
              </div>
              {status}
              {actions}
            </section>
            <nav className="showroom-shop-models" aria-label="Koleksi Cung Motor">
              {vehicleChoices(orderedVehicles)}
            </nav>
          </div>
        </div>
      ) : (
        <div className="showroom-shop-gear-page">
          <div className="showroom-shop-top">
            <strong>Perlengkapan</strong>
            {cashBadge}
          </div>
          {quote && (
            <ShowroomGearCatalog
              data={quote}
              busy={pending || !!order}
              onBuy={startPurchase}
              onEquip={(kind, id) => {
                setNotice("");
                void equipShowroomGear(kind, id);
              }}
            />
          )}
          {status}
          {(order || feedback || !quote?.garasi.hasWarung) && (
            <div className="showroom-shop-gear-footer">{actions}</div>
          )}
        </div>
      )}
    </VehicleCollectionScreen>
  );
}
