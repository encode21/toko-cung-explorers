import { useEffect } from "react";
import { Gift } from "lucide-react";
import { claimDailyLogin, loadDailyLogin, useDailyLogin } from "@/game/daily/login";
import { useHud } from "@/state/hud-store";

export function DailyLoginPanel() {
  const status = useDailyLogin((s) => s.status);
  const busy = useDailyLogin((s) => s.busy);
  const error = useDailyLogin((s) => s.error);
  useEffect(() => {
    useDailyLogin.setState({ error: "" });
    void loadDailyLogin();
  }, []);
  const claimable = !!status?.enabled && !status.claimedToday;
  const notice = !status
    ? "Memuat hadiah…"
    : !status.enabled
      ? "Event login harian sedang tidak aktif."
      : status.claimedToday
        ? "Hadiah hari ini sudah diterima. Kembali lagi besok!"
        : "Hadiah hari ini siap diambil.";
  return (
    <div className="daily-login-panel">
      <div className="daily-login-intro">
        <div>
          <span className="daily-login-badge">Event harian</span>
          <h3>Login harian</h3>
          <p>Masuk ke dunia Toko Cung setiap hari dan ambil hadiahmu.</p>
        </div>
        <Gift className="daily-login-hero-gift" aria-hidden="true" />
      </div>
      <div className="daily-login-content">
        {status?.enabled && <p className="daily-login-reward">+{status.points} Point</p>}
        <p className="daily-login-notice" role={error ? "alert" : "status"}>
          {error || notice}
        </p>
      </div>
      <div className="daily-login-footer">
        {claimable ? (
          <button type="button" disabled={busy} onClick={() => void claimDailyLogin()}>
            {busy ? "Mengambil…" : "Ambil hadiah"}
          </button>
        ) : (
          <button type="button" onClick={() => useHud.getState().setSheet(null)}>
            Oke
          </button>
        )}
      </div>
    </div>
  );
}
