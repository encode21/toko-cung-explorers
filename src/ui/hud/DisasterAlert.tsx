import { useEffect } from "react";
import { openWarungPanel, useWarung } from "@/game/warung/store";
import { disasterTitle, QUAKE_MS } from "@/game/warung/disaster-alert";
import "./disaster-alert.css";

/** Shown wherever the player is when a shared disaster damages their warung. */
export function DisasterAlert() {
  const alert = useWarung((s) => s.disasterAlert);
  useEffect(() => {
    if (!alert) return;
    // The whole screen shakes briefly; CSS skips it for prefers-reduced-motion.
    const root = document.documentElement;
    root.classList.add("disaster-quake");
    const timer = window.setTimeout(() => root.classList.remove("disaster-quake"), QUAKE_MS);
    return () => {
      window.clearTimeout(timer);
      root.classList.remove("disaster-quake");
    };
  }, [alert]);
  if (!alert) return null;
  const close = () => useWarung.setState({ disasterAlert: null });
  return (
    <div className="disaster-alert" role="alert">
      <strong>⚠️ {disasterTitle(alert.kind)}</strong>
      <p>{alert.text}</p>
      <p className="disaster-alert-hint">Warungmu rusak dan tidak berjualan sampai direnovasi.</p>
      <div className="disaster-alert-actions">
        <button
          type="button"
          className="disaster-alert-primary"
          onClick={() => {
            close();
            openWarungPanel("home");
          }}
        >
          Cek warung
        </button>
        <button type="button" onClick={close}>
          Nanti
        </button>
      </div>
    </div>
  );
}
