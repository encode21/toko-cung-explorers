import { useState } from "react";
import { ArrowRight, Clock3, Hammer, TriangleAlert, TrendingUp } from "lucide-react";
import { rupiah, type MyWarung } from "@/game/warung/model";
import { useWarung, warungCommand } from "@/game/warung/store";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { PhoneAppArtwork } from "./PhoneAppArtwork";
import "./warung-renovation-confirm.css";

export function WarungRenovationConfirm({
  warung,
  action,
  onClose,
}: {
  warung: MyWarung;
  action: "upgrade" | "repair";
  onClose: () => void;
}) {
  const busy = useWarung((state) => state.busy);
  const [error, setError] = useState("");
  const upgrade = action === "upgrade" ? warung.upgradePreview : null;
  const repair = action === "repair" ? warung.damage : null;
  const cost = upgrade?.cost ?? repair?.netCost;
  if (cost === undefined) return null;

  const title = upgrade ? "Konfirmasi Renovasi" : "Konfirmasi Perbaikan";
  const amount = rupiah(cost);

  const confirm = async () => {
    const latest = useWarung.getState();
    if (latest.busy) return;
    const current = latest.data?.warung;
    const sameQuote = upgrade
      ? current?.damage?.status !== "damaged" &&
        current?.upgradePreview?.level === upgrade.level &&
        current.upgradePreview.cost === cost &&
        current.upgradePreview.renovationMinutes === upgrade.renovationMinutes
      : current?.damage?.status === "damaged" &&
        current.damage.id === repair?.id &&
        current.damage.netCost === cost;
    if (current?.id !== warung.id || current.renovation || !sameQuote) {
      setError("Rincian berubah. Periksa kembali biaya sebelum membayar.");
      return;
    }
    if (current.cash < cost) return;

    setError("");
    const result = await warungCommand(action);
    if (result) onClose();
    else setError(useWarung.getState().error || "Pembayaran belum berhasil. Coba lagi.");
  };

  return (
    <GameModal
      title={title}
      className="game-light warung-renovation-confirm"
      bodyClassName="warung-renovation-body"
      onClose={() => {
        if (!useWarung.getState().busy) onClose();
      }}
      footer={
        <GameButton
          className="warung-renovation-pay"
          aria-label={busy ? "Memproses…" : `${title} seharga ${amount}`}
          disabled={busy || warung.cash < cost}
          onClick={() => void confirm()}
        >
          {busy ? (
            "Memproses…"
          ) : (
            <>
              <KasMoneyIcon />
              <span>{amount}</span>
            </>
          )}
        </GameButton>
      }
    >
      <div className="warung-renovation-steps">
        <div>
          <span className="warung-renovation-art">
            {upgrade ? <PhoneAppArtwork kind="warung" /> : <TriangleAlert aria-hidden />}
          </span>
          <strong>{upgrade ? `Lv. ${warung.level}` : "Kerusakan"}</strong>
          <small>{upgrade ? warung.levelName : repair?.name}</small>
        </div>
        <ArrowRight size={18} aria-hidden />
        <div>
          <span className="warung-renovation-art">
            {upgrade ? <TrendingUp aria-hidden /> : <Hammer aria-hidden />}
          </span>
          <strong>{upgrade ? `Lv. ${upgrade.level}` : "Perbaikan"}</strong>
          <small>{upgrade?.name ?? warung.name}</small>
        </div>
      </div>
      <p>Warung tutup selama {upgrade ? "renovasi" : "perbaikan"}.</p>
      {upgrade && (
        <p className="warung-renovation-duration">
          <Clock3 size={15} aria-hidden />
          <span>
            {upgrade.renovationGameDays} hari game · ±{upgrade.renovationMinutes} menit
          </span>
        </p>
      )}
      {!!repair?.subsidyAmount && (
        <p>Biaya sudah dipotong subsidi Walikota {rupiah(repair.subsidyAmount)}.</p>
      )}
      {warung.cash < cost && (
        <p className="warung-renovation-message" role="status">
          Kas warung kurang {rupiah(cost - warung.cash)}.
        </p>
      )}
      {error && (
        <p className="warung-renovation-message" role="alert">
          {error}
        </p>
      )}
    </GameModal>
  );
}
