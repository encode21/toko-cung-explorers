import { canFundWholesale } from "@/game/gang/economy";
import { useEffect, useRef, useState } from "react";
import { Package, Truck } from "lucide-react";
import { useGame } from "@/state/game-store";
import {
  deliveryFee,
  payBasket,
  pickupBoxes,
  unloadBoxes,
  useWarung,
  warungCommand,
} from "@/game/warung/store";
import { PICKUP_SPOT, rupiah } from "@/game/warung/model";
import { basketTotal } from "@/game/warung/agen";
import { WARUNG_LOTS, lotFront } from "@/game/warung/lots";
import { leaveKioskQueue } from "@/game/warung/kiosk-queue";
import "./kulakan-delivery.css";

const NEAR_PICKUP = 4;
const NEAR_WARUNG = 7;

/** World point in front of the house where my warung shows in this channel (or my own kavling). */
export function myWarungFront(): [number, number] | null {
  const s = useWarung.getState();
  const id = s.data?.warung?.id;
  const lot =
    s.lots.find((c) => c.id === id)?.lot ?? s.data?.lotMarket?.find((m) => m.mine)?.lot ?? null;
  const l = lot === null ? undefined : WARUNG_LOTS[lot];
  return l ? lotFront(l) : null;
}

function distTo([x, z]: [number, number]) {
  const [px, , pz] = useGame.getState().playerPos;
  return Math.hypot(px - x, pz - z);
}

/**
 * Kulakan delivery bar: antar/ambil choice after Bayar, the truck countdown, "Angkat dus" at the
 * pickup area and "Taruh dus" at your warung (or inside it).
 */
export function DeliveryPrompt({
  inline = false,
  compact = false,
}: {
  inline?: boolean;
  compact?: boolean;
}) {
  const cash = useWarung((s) => s.data?.warung?.cash ?? 0);
  const loan = useWarung((s) => s.data?.kasbon);
  const payChoice = useWarung((s) => s.payChoice);
  const shipments = useWarung((s) => s.data?.shipments);
  const busy = useWarung((s) => s.busy);
  const inOwnWarung = useWarung((s) => !!s.inside && s.inside.id === s.data?.warung?.id);
  const total = useWarung((s) => basketTotal(s.basket, s.data));
  const [, tick] = useState(0);
  const lastRead = useRef(0);
  useEffect(() => {
    const mine = shipments?.some((s) => s.mode === "ambil" && s.status === "PENDING");
    const game = useGame.getState();
    if (mine && (!game.waypoint || game.waypoint === "map-store"))
      game.setWaypoint("kulakan-pickup");
    if (!mine && game.waypoint === "kulakan-pickup") game.setWaypoint(null);
  }, [shipments]);
  useEffect(() => {
    const t = setInterval(() => {
      tick((n) => n + 1);
      // Truck arrived: read once (every 5 s at most) so stock lands and the bar clears.
      const arrived = useWarung
        .getState()
        .data?.shipments?.some(
          (shipment) =>
            shipment.mode === "antar" && shipment.etaAt && Date.parse(shipment.etaAt) <= Date.now(),
        );
      if (arrived && Date.now() - lastRead.current > 5000) {
        lastRead.current = Date.now();
        void warungCommand("read");
      }
    }, 1000);
    return () => clearInterval(t);
  }, []);

  const wrap = (body: React.ReactNode) => (
    <div
      className={
        compact
          ? "warung-delivery-compact"
          : inline
            ? "warung-delivery-inline"
            : "warung-world-prompt warung-delivery-prompt pointer-events-auto"
      }
      data-warung-delivery
    >
      <div className="warung-hud-bar">{body}</div>
    </div>
  );

  if (payChoice)
    return wrap(
      <>
        <div>
          <strong>Dikirim atau bawa sendiri?</strong>
          <span>Barang {rupiah(total)}</span>
          {loan && <span>{loan.text["hint"]}</span>}
        </div>
        <button
          type="button"
          className="warung-cta"
          disabled={
            busy || !canFundWholesale(cash, loan?.available ?? 0, total, deliveryFee(total))
          }
          onClick={() => void payBasket("antar").then((ok) => ok && leaveKioskQueue())}
        >
          Antar · {rupiah(deliveryFee(total))}
        </button>
        <button
          type="button"
          className="warung-secondary"
          disabled={busy || !canFundWholesale(cash, loan?.available ?? 0, total)}
          onClick={() => void payBasket("ambil").then((ok) => ok && leaveKioskQueue())}
        >
          Bawa sendiri
        </button>
        <button
          type="button"
          className="warung-hud-exit"
          onClick={() => useWarung.setState({ payChoice: false })}
        >
          Batal
        </button>
      </>,
    );

  if (!shipments?.length) return null;
  const carrying = shipments.filter((s) => s.status === "CARRYING");
  const waiting = shipments.filter((s) => s.mode === "ambil" && s.status === "PENDING");
  const trucks = shipments.filter((s) => s.mode === "antar" && s.etaAt);
  const boxes = (list: typeof shipments) => list.reduce((a, s) => a + s.boxes, 0);

  if (carrying.length) {
    const front = myWarungFront();
    const here = inOwnWarung || (front !== null && distTo(front) < NEAR_WARUNG);
    return wrap(
      <>
        {compact && <Package size={22} className="warung-delivery-icon" aria-hidden />}
        <div>
          <strong>Bawa {boxes(carrying)} dus</strong>
          <span>
            {here ? "Sudah sampai warung" : "Antar ke warungmu: jalan kaki, motor, atau mobil"}
          </span>
        </div>
        {here && (
          <button
            type="button"
            className="warung-cta"
            disabled={busy}
            onClick={() => void unloadBoxes()}
          >
            Taruh dus
          </button>
        )}
      </>,
    );
  }
  if (waiting.length) {
    const here = distTo(PICKUP_SPOT) < NEAR_PICKUP;
    return wrap(
      <>
        {compact && <Package size={22} className="warung-delivery-icon" aria-hidden />}
        <div>
          <strong>{boxes(waiting)} dus menunggu</strong>
          <span>
            {here
              ? "Di tanda kuning AMBIL DUS"
              : "Ikuti panah ke tanda kuning AMBIL DUS, driveway timur"}
          </span>
        </div>
        {here && (
          <button
            type="button"
            className="warung-cta"
            disabled={busy}
            onClick={() => void pickupBoxes()}
          >
            Angkat dus
          </button>
        )}
      </>,
    );
  }
  if (trucks.length) {
    const eta = Math.min(...trucks.map((s) => Date.parse(s.etaAt!)));
    const left = Math.max(0, Math.ceil((eta - Date.now()) / 1000));
    return wrap(
      <>
        <Truck size={22} className="warung-delivery-icon" aria-hidden />
        <div>
          <strong>
            {compact
              ? `Pengantaran · ${boxes(trucks)} dus`
              : `Truk Toko Cung mengantar ${boxes(trucks)} dus`}
          </strong>
          <span>
            {left > 0
              ? `${trucks.length > 1 ? "Tiba berikutnya" : "Tiba"} ± ${Math.floor(left / 60)}:${String(left % 60).padStart(2, "0")}`
              : "Menurunkan barang…"}
          </span>
        </div>
      </>,
    );
  }
  return null;
}
