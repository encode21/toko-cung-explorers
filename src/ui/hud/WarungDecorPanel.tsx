import { useCallback, useEffect, useRef, useState } from "react";
import { PaintRoller, RefreshCw, Store, X } from "lucide-react";
import { useWarung, warungCommand } from "@/game/warung/store";
import { useHud } from "@/state/hud-store";
import { createPortal } from "react-dom";
import { useGamePanelLock } from "@/ui/game-ui/GamePanel";
import "@/ui/profile/appearance-studio.css";
import { WarungDecorTab } from "./WarungDecorTab";
import { WarungKasBalance } from "./WarungKasBalance";
import "./warung-decor.css";

/** Docked catalog: the live warung remains visible without a modal or backdrop. */
export function WarungDecorPanel() {
  useGamePanelLock();
  const pageRef = useRef<HTMLElement>(null);
  const container =
    typeof document === "undefined"
      ? null
      : (document.querySelector<HTMLElement>("[data-game-ui-root]") ??
        document.querySelector<HTMLElement>(".world-viewport"));
  useEffect(() => {
    const page = pageRef.current;
    if (!page) return;
    const previousFocus = document.activeElement;
    const siblings = Array.from(page.parentElement?.children ?? [])
      .filter(
        (element): element is HTMLElement => element instanceof HTMLElement && element !== page,
      )
      .map((element) => ({ element, inert: element.inert }));
    siblings.forEach(({ element }) => {
      element.inert = true;
    });
    page.querySelector<HTMLElement>("[data-game-close]")?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || document.querySelector(".game-modal")) return;
      event.preventDefault();
      event.stopPropagation();
      useHud.getState().setSheet(null);
    };
    document.addEventListener("keydown", key);
    return () => {
      document.removeEventListener("keydown", key);
      siblings.forEach(({ element, inert }) => {
        element.inert = inert;
      });
      requestAnimationFrame(() => {
        if (document.querySelector("[data-game-panel]")) return;
        const target =
          document.querySelector<HTMLElement>("[data-warung-decor]") ??
          (previousFocus instanceof HTMLElement && previousFocus.isConnected
            ? previousFocus
            : null);
        target?.focus();
      });
    };
  }, []);
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const [loading, setLoading] = useState(!data);
  const [loadError, setLoadError] = useState("");
  const mounted = useRef(true);
  const load = useCallback(async () => {
    if (useWarung.getState().busy) {
      setLoading(false);
      setLoadError("Data warung sedang diperbarui. Coba lagi sebentar.");
      return;
    }
    setLoading(true);
    setLoadError("");
    const result = await warungCommand("read");
    if (!mounted.current) return;
    setLoading(false);
    if (!result) setLoadError(useWarung.getState().error || "Dekorasi belum bisa dimuat.");
  }, []);
  useEffect(() => {
    mounted.current = true;
    if (!useWarung.getState().data) void load();
    return () => {
      mounted.current = false;
    };
  }, [load]);
  const missingCatalog = !!data?.warung && (!data.decor || !data.warung.style);

  const header = (
    <header className="appearance-catalog-header warung-decor-header">
      <h2>Dekorasi</h2>
      <WarungKasBalance />
      <button
        type="button"
        className="warung-decor-close"
        data-game-close
        aria-label="Tutup dekorasi"
        onClick={() => useHud.getState().setSheet(null)}
      >
        <X size={26} strokeWidth={3} aria-hidden />
      </button>
    </header>
  );
  if (!container) return null;
  return createPortal(
    <main
      ref={pageRef}
      className="warung-decor-page"
      aria-label="Dekorasi"
      data-ui-panel
      data-hud-control
      data-game-panel
    >
      {data?.warung && !missingCatalog ? (
        <WarungDecorTab header={header} />
      ) : (
        <section className="appearance-catalog warung-decor-sheet">
          {header}
          {loading && !data ? (
            <div className="warung-decor-empty" role="status">
              <PaintRoller size={40} aria-hidden />
              <h3>Menyiapkan dekorasi…</h3>
            </div>
          ) : !data || missingCatalog ? (
            <div className="warung-decor-empty">
              <PaintRoller size={40} aria-hidden />
              <h3>Dekorasi belum bisa dimuat</h3>
              <p role={loadError ? "alert" : undefined}>
                {loadError || "Muat ulang untuk melihat pilihan dekorasi warungmu."}
              </p>
              <button
                type="button"
                className="warung-decor-apply"
                disabled={busy || loading}
                onClick={() => void load()}
              >
                <RefreshCw size={16} aria-hidden />
                {loading ? "Memuat…" : "Coba lagi"}
              </button>
            </div>
          ) : !data.warung ? (
            <div className="warung-decor-empty">
              <Store size={40} aria-hidden />
              <h3>Buka warung untuk mulai mendekorasi</h3>
              <p>Pilihan dinding, kanopi, lantai, dan hiasan akan tersedia di sini.</p>
              <button
                type="button"
                className="warung-decor-apply"
                onClick={() => useHud.getState().setSheet("warung")}
              >
                Buka Warungku
              </button>
            </div>
          ) : null}
        </section>
      )}
    </main>,
    container,
  );
}
