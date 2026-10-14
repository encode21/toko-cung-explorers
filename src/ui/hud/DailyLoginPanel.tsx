import { Gift, LockKeyhole, Sparkles } from "lucide-react";
import { useHud } from "@/state/hud-store";

/** Calendar shell until a server-configured login campaign and claim operation are available. */
export function DailyLoginPanel() {
  return (
    <div className="daily-login-panel">
      <div className="daily-login-intro">
        <div>
          <span className="daily-login-badge">Segera hadir</span>
          <h3>Stempel harian</h3>
          <p>Kunjungi dunia Toko Cung dan nantikan kejutan setiap hari.</p>
        </div>
        <Gift className="daily-login-hero-gift" aria-hidden="true" />
      </div>
      <div className="daily-login-content">
        <ol className="daily-login-calendar" aria-label="Kalender hadiah login tujuh hari">
          {Array.from({ length: 7 }, (_, index) => (
            <li
              key={index}
              className={`daily-login-day ${index === 6 ? "daily-login-day-final" : ""}`}
            >
              <h4>Hari ke-{index + 1}</h4>
              <div className="daily-login-gift">
                <Sparkles className="daily-login-sparkles" aria-hidden="true" />
                <Gift aria-hidden="true" />
                <LockKeyhole className="daily-login-lock" aria-hidden="true" />
              </div>
              <span>Hadiah belum tersedia</span>
            </li>
          ))}
        </ol>
        <p className="daily-login-notice" role="status">
          Hadiah login harian belum tersedia. Jadwal dan hadiah akan muncul di sini.
        </p>
      </div>
      <div className="daily-login-footer">
        <button type="button" onClick={() => useHud.getState().setSheet(null)}>
          Oke
        </button>
      </div>
    </div>
  );
}
