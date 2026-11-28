import { Truck } from "lucide-react";
import { GameModal, GameButton } from "@/ui/game-ui/GamePanel";
import { useWarung } from "@/game/warung/store";
import { rupiah } from "@/game/warung/model";
import { deliveryCommand, useDelivery } from "@/game/delivery/store";
import { NIAGA_NAME, closeNiagaDealer, useNiagaDealer } from "@/game/delivery/niaga";
import type { DealerCatalogItem, DeliveryVehicle } from "@/game/delivery/model";
import "./travel-loader.css";

/** Slot yang diganti saat beli: utamakan yang masih sewa, lalu milik dengan varian lain. */
function targetSlot(item: DealerCatalogItem, vehicles: DeliveryVehicle[]) {
  const slots = vehicles.filter((v) => v.type === item.slotType && v.status !== "BUSY");
  return (
    slots.find((v) => v.ownership === "rented") ?? slots.find((v) => v.variant !== item.id) ?? null
  );
}

export function NiagaDealerPanel() {
  const open = useNiagaDealer((s) => s.open);
  const warung = useWarung((s) => s.data?.warung ?? null);
  const delivery = useWarung((s) => s.data?.delivery ?? null);
  const { busy, error } = useDelivery();
  if (!open) return null;

  const catalog = delivery?.dealerCatalog ?? [];
  const vehicles = delivery?.vehicles ?? [];
  const rented = vehicles.filter((v) => v.ownership === "rented" && v.type !== "motor");

  return (
    <GameModal
      title={NIAGA_NAME}
      subtitle="Dealer kendaraan niaga · sebelah Cung Motor"
      onClose={closeNiagaDealer}
      className="bus-travel-panel"
    >
      {!warung ? (
        <p className="bus-travel-hint">
          Buka warung dulu. Kendaraan niaga dipakai untuk pesan antar.
        </p>
      ) : (
        <>
          <p className="bus-travel-hint">
            Armada yang datang saat warung naik level masih <b>sewa</b>: Koko Cung memotong
            persentase dari ongkir setiap antaran. Beli di sini supaya jadi milikmu, tanpa potongan.
          </p>
          {rented.length > 0 && (
            <p className="bus-travel-hint">
              Masih sewa:{" "}
              {rented.map((v) => `${v.label} (setoran ${v.setoranPercent}%)`).join(", ")}
            </p>
          )}
          {error && (
            <p role="alert" className="bus-travel-hint">
              {error}
            </p>
          )}
          <div className="bus-travel-options">
            {catalog.map((item) => {
              const slot = targetSlot(item, vehicles);
              const owned = vehicles.some((v) => v.variant === item.id && v.ownership === "owned");
              const reason =
                warung.level < item.minLevel
                  ? `Butuh warung level ${item.minLevel}`
                  : owned && !slot
                    ? "Sudah dimiliki"
                    : !slot
                      ? "Belum ada slot armada untuk kendaraan ini"
                      : warung.cash < item.price
                        ? "Kas usaha belum cukup"
                        : null;
              return (
                <GameButton
                  key={item.id}
                  disabled={busy || !!reason}
                  onClick={() =>
                    slot &&
                    void deliveryCommand("delivery_buy_vehicle", {
                      vehicleId: slot.id,
                      variant: item.id,
                    })
                  }
                >
                  <Truck size={24} aria-hidden />
                  <span>
                    <strong>{item.name}</strong>
                    <small>
                      {item.capacity} dus{item.rainProof ? " · tahan hujan" : ""} ·{" "}
                      {item.description}
                    </small>
                    <small>{reason ?? (slot ? `Menggantikan ${slot.label}` : "")}</small>
                  </span>
                  <b>{rupiah(item.price)}</b>
                </GameButton>
              );
            })}
          </div>
        </>
      )}
    </GameModal>
  );
}
