import { Clock3, PackageCheck } from "lucide-react";
import { useHud } from "@/state/hud-store";
import { useWarung } from "@/game/warung/store";
import { GameModal, type PanelProps } from "@/ui/game-ui/GamePanel";
import { HudMenuArtwork } from "./HudMenuArtwork";
import { useDeliveryStatus } from "./use-delivery-status";
import "./delivery-details.css";

export function DeliveryDetailsPanel({ onCloseAutoFocus }: Pick<PanelProps, "onCloseAutoFocus">) {
  const { active, boxes, trucks, left, countdown } = useDeliveryStatus();
  const destination = useWarung((s) => s.data?.warung?.name);
  const close = () => useHud.getState().setSheet(null);
  const multiple = trucks.length > 1;

  return (
    <GameModal
      title="Pengiriman Toko Cung"
      className="delivery-details-modal"
      bodyClassName="delivery-details-body"
      onClose={close}
      {...(onCloseAutoFocus ? { onCloseAutoFocus } : {})}
      footer={
        <button type="button" className="delivery-details-confirm" onClick={close}>
          Oke
        </button>
      }
    >
      <div className="delivery-details-art" aria-hidden="true">
        <HudMenuArtwork kind="delivery" />
      </div>
      <div className="delivery-details-copy">
        <p className="delivery-details-summary" role="status">
          {active
            ? `${boxes.toLocaleString("id-ID")} dus ${multiple ? "dalam pengiriman" : left > 0 ? "sedang diantar" : "sedang diturunkan"}`
            : "Tidak ada pengiriman aktif"}
        </p>
        {active && (
          <p className="delivery-details-destination">
            Tujuan: <strong>{destination || "Warungmu"}</strong>
          </p>
        )}
        {multiple && <p className="delivery-details-count">Total {trucks.length} pengiriman.</p>}
        {active ? (
          <dl className="delivery-details-eta">
            <dt>
              <Clock3 aria-hidden="true" />
              {left > 0 ? (multiple ? "Tiba berikutnya" : "Perkiraan tiba") : "Status"}
            </dt>
            <dd>{left > 0 ? countdown : "Menurunkan barang"}</dd>
          </dl>
        ) : (
          <p className="delivery-details-empty">
            <PackageCheck aria-hidden="true" /> Tidak ada kiriman dalam perjalanan.
          </p>
        )}
        <p className="delivery-details-note">
          {active
            ? "Stok warung diperbarui otomatis setelah barang tiba."
            : "Cek stok terbaru di warungmu."}
        </p>
      </div>
    </GameModal>
  );
}
