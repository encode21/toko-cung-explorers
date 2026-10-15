import { useState, type ReactNode } from "react";
import { RotateCcw, Scan, X } from "lucide-react";
import { GameModal } from "@/ui/game-ui/GamePanel";
import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";
import { useGameCore } from "@/game/core/store";
import "./appearance-studio.css";

const compactPoint = new Intl.NumberFormat("id-ID", {
  notation: "compact",
  maximumFractionDigits: 1,
});

/** Shared page frame for both avatar systems; each editor retains its own live draft. */
export function AppearanceStudio({
  preview,
  navigation,
  sideNavigation,
  children,
  footer,
  onBack,
  onReset,
  busy = false,
  backLabel = "Kembali ke profil",
  title = "Buatlah karakter yang",
  subtitle = "sesuai dengan dirimu!",
}: {
  preview: ReactNode;
  navigation: ReactNode;
  sideNavigation?: ReactNode;
  children: ReactNode;
  footer: ReactNode;
  onBack: () => void;
  onReset: () => void;
  busy?: boolean;
  backLabel?: string;
  title?: string;
  subtitle?: string;
}) {
  const points = useGameCore((state) => state.snapshot?.wallet.current_balance);
  const pointLabel =
    points == null ? "Point belum tersedia" : `${points.toLocaleString("id-ID")} Point`;
  const [resetOpen, setResetOpen] = useState(false);
  const [camera, setCamera] = useState(0);
  return (
    <div className="appearance-studio">
      <section className="appearance-stage" aria-label="Pratinjau penampilan">
        <header>
          <h3>{title}</h3>
          <p>{subtitle}</p>
        </header>
        <div className="appearance-model" key={camera}>
          {preview}
        </div>
        <div className="appearance-tools">
          <button
            type="button"
            aria-label="Reset kamera"
            title="Reset kamera"
            disabled={busy}
            onClick={() => setCamera((v) => v + 1)}
          >
            <Scan aria-hidden />
          </button>
          <button
            type="button"
            aria-label="Reset penampilan"
            title="Reset penampilan"
            disabled={busy}
            onClick={() => setResetOpen(true)}
          >
            <RotateCcw aria-hidden />
          </button>
        </div>
        <p className="appearance-rotate-hint">Geser karakter untuk memutar</p>
      </section>
      <section className="appearance-catalog" aria-label="Pilihan penampilan">
        {sideNavigation && <div className="appearance-side-navigation">{sideNavigation}</div>}
        <header className="appearance-catalog-header">
          {navigation}
          <div
            className="appearance-point-balance"
            data-appearance-point
            role="img"
            aria-label={pointLabel}
            title={pointLabel}
          >
            <PointCoinIcon className="appearance-point-coin" />
            <span>{points == null ? "—" : compactPoint.format(points)}</span>
          </div>
          <button
            type="button"
            className="appearance-back"
            aria-label={backLabel}
            title="Kembali"
            onClick={onBack}
            disabled={busy}
          >
            <X aria-hidden />
          </button>
        </header>
        <div className="appearance-options">{children}</div>
        <footer className="appearance-footer">{footer}</footer>
      </section>
      {resetOpen && (
        <GameModal
          title="Kembali"
          className="appearance-reset-modal"
          bodyClassName="appearance-reset-body"
          onClose={() => setResetOpen(false)}
        >
          <p>
            Ingin mengembalikan penampilan yang sedang dicoba?
            <br />
            Kamu akan kembali ke penampilan terakhir yang disimpan.
          </p>
          <div className="appearance-reset-actions">
            <button type="button" onClick={() => setResetOpen(false)}>
              Tidak
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                onReset();
                setResetOpen(false);
              }}
            >
              Iya
            </button>
          </div>
        </GameModal>
      )}
    </div>
  );
}
