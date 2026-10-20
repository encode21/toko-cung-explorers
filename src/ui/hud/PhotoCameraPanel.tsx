import { useEffect, useRef, useState } from "react";
import { Download, RotateCcw, SwitchCamera } from "lucide-react";
import { GameButton, GameIconButton, GameModal } from "@/ui/game-ui/GamePanel";
import { useHud } from "@/state/hud-store";
import { usePhoto } from "@/game/photo/photo-store";
import "./photo-camera.css";

export function PhotoCameraPanel() {
  const photo = usePhoto();
  const drag = useRef<{ id: number; x: number; y: number } | null>(null);
  const [saveError, setSaveError] = useState(false);
  useEffect(() => {
    usePhoto.getState().reset();
    return () => usePhoto.getState().reset();
  }, []);
  return (
    <GameModal
      title="Kamera"
      className="game-photo-sheet"
      bodyClassName="photo-camera-body"
      onClose={() => useHud.getState().setSheet("phone")}
      onCloseAutoFocus={(event) => {
        event.preventDefault();
        requestAnimationFrame(() => {
          (
            document.querySelector<HTMLElement>('[data-phone-app="camera"]') ??
            document.querySelector<HTMLElement>('[data-side-action="phone"]')
          )?.focus();
        });
      }}
    >
      <div className="photo-camera-modes" role="group" aria-label="Mode kamera">
        <button
          type="button"
          aria-pressed={photo.mode === "selfie"}
          disabled={photo.busy || !!photo.image}
          onClick={() => photo.setMode("selfie")}
        >
          Selfie
        </button>
        <button
          type="button"
          aria-pressed={photo.mode === "rear"}
          disabled={photo.busy || !!photo.image}
          onClick={() => photo.setMode("rear")}
        >
          Kamera Belakang
        </button>
      </div>
      <div
        className={`photo-camera-frame ${photo.image ? "has-photo" : ""}`}
        data-photo-frame
        role="group"
        tabIndex={photo.image ? -1 : 0}
        aria-label="Bingkai foto. Geser atau gunakan tombol panah untuk mengatur arah kamera."
        onPointerDown={(e) => {
          if (photo.image || photo.busy || e.button !== 0) return;
          e.currentTarget.setPointerCapture(e.pointerId);
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerMove={(e) => {
          const previous = drag.current;
          if (!previous || previous.id !== e.pointerId) return;
          const rect = e.currentTarget.getBoundingClientRect();
          photo.aim(
            (-(e.clientX - previous.x) / Math.max(1, rect.width)) * 2.5,
            (e.clientY - previous.y) / Math.max(1, rect.height),
          );
          drag.current = { id: e.pointerId, x: e.clientX, y: e.clientY };
        }}
        onPointerUp={() => {
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onLostPointerCapture={() => {
          drag.current = null;
        }}
        onKeyDown={(e) => {
          const steps: Record<string, [number, number]> = {
            ArrowLeft: [0.08, 0],
            ArrowRight: [-0.08, 0],
            ArrowUp: [0, 0.06],
            ArrowDown: [0, -0.06],
          };
          const step = steps[e.key];
          if (!step) return;
          e.preventDefault();
          e.stopPropagation();
          photo.aim(...step);
        }}
      >
        {photo.image && <img src={photo.image} alt="Hasil foto di Toko Cung" />}
        <i />
        <i />
        <i />
        <i />
      </div>
      <div className="photo-camera-actions">
        {photo.image ? (
          <>
            <GameButton
              className="photo-save"
              onClick={() => {
                try {
                  const link = document.createElement("a");
                  link.href = photo.image!;
                  link.download = `toko-cung-${photo.mode}-${new Date().toISOString().replace(/[:.]/g, "-")}.png`;
                  document.body.appendChild(link);
                  link.click();
                  link.remove();
                } catch {
                  setSaveError(true);
                }
              }}
            >
              <Download aria-hidden />
              Simpan foto
            </GameButton>
            <GameButton
              onClick={() => {
                setSaveError(false);
                photo.retake();
              }}
            >
              <RotateCcw aria-hidden />
              Ambil ulang
            </GameButton>
          </>
        ) : (
          <>
            <GameIconButton
              label={photo.mode === "selfie" ? "Ganti ke kamera belakang" : "Ganti ke selfie"}
              disabled={photo.busy}
              onClick={() => photo.setMode(photo.mode === "selfie" ? "rear" : "selfie")}
            >
              <SwitchCamera aria-hidden />
            </GameIconButton>
            <button
              type="button"
              className="photo-shutter"
              aria-label="Ambil foto"
              disabled={!photo.ready || photo.busy}
              onClick={photo.shoot}
            >
              <span />
            </button>
          </>
        )}
      </div>
      <p className="photo-camera-hint" role="status" aria-live="polite">
        {saveError
          ? "Foto belum tersimpan. Coba tombol Simpan foto lagi."
          : (photo.error ??
            (photo.image
              ? "Foto siap! Simpan momenmu."
              : photo.busy
                ? "Memproses foto…"
                : "Geser bingkai untuk mengatur sudut foto"))}
      </p>
    </GameModal>
  );
}
