import { useEffect } from "react";
import { Check, Gift, LockKeyhole, Sparkles } from "lucide-react";
import { claimDailyLogin, loadDailyLogin, useDailyLogin } from "@/game/daily/login";
import { PointCoinIcon } from "@/ui/game-ui/PointCoinIcon";

export function DailyLoginPanel() {
  const status = useDailyLogin((s) => s.status);
  const busy = useDailyLogin((s) => s.busy);
  const error = useDailyLogin((s) => s.error);
  useEffect(() => {
    useDailyLogin.setState({ error: "" });
    void loadDailyLogin();
  }, []);
  const claimable = !!status?.enabled && !status.claimedToday && !status.budgetExhausted;
  const notice = !status
    ? "Memuat hadiah…"
    : !status.enabled
      ? "Event login harian sedang tidak aktif."
      : status.claimedToday
        ? "Hadiah hari ini sudah diterima. Kembali lagi besok!"
        : status.budgetExhausted
          ? "Hadiah event sudah habis. Terima kasih sudah ikut bermain!"
          : `Hadiah hari ke-${status.currentDay} siap diklaim. Reset setiap 00.00 WIB.`;
  return (
    <div className="daily-login-panel">
      <div className="daily-login-intro">
        <div>
          <span className="daily-login-badge">7 hari hadiah</span>
          <h3>Datang, klaim, ulangi!</h3>
          <p>Kumpulkan 7 stempel. Satu hadiah setiap hari, progresmu tetap tersimpan.</p>
        </div>
        <Gift className="daily-login-hero-gift" aria-hidden="true" />
      </div>
      <div className="daily-login-content">
        <ol className="daily-login-calendar" aria-label="Kalender hadiah login tujuh hari">
          {Array.from({ length: 7 }, (_, index) => {
            const day = status?.days?.[index];
            const today = day?.day === status?.currentDay;
            const state = day?.claimed ? "claimed" : today && claimable ? "available" : "locked";
            return (
              <li
                key={index}
                data-state={state}
                aria-current={today ? "step" : undefined}
                className={`daily-login-day ${index === 6 ? "daily-login-day-final" : ""}`}
              >
                <h4>Hari ke-{index + 1}</h4>
                <div className="daily-login-gift">
                  <Sparkles className="daily-login-sparkles" aria-hidden="true" />
                  <PointCoinIcon />
                  {day?.claimed ? (
                    <Check className="daily-login-stamp" aria-hidden="true" />
                  ) : (
                    state === "locked" && (
                      <LockKeyhole className="daily-login-lock" aria-hidden="true" />
                    )
                  )}
                </div>
                <strong className="daily-login-amount">{day ? `${day.points} Point` : "—"}</strong>
                <span>
                  {!status
                    ? "Memuat…"
                    : day?.claimed
                      ? "Diklaim"
                      : state === "available"
                        ? "Klaim hari ini"
                        : "Terkunci"}
                </span>
              </li>
            );
          })}
        </ol>
        <p className="daily-login-notice" role={error ? "alert" : "status"}>
          {error || notice}
        </p>
      </div>
      <div className="daily-login-footer">
        {error ? (
          <button type="button" disabled={busy} onClick={() => void loadDailyLogin()}>
            Coba lagi
          </button>
        ) : (
          <button
            type="button"
            disabled={busy || !claimable || !status?.days?.length}
            onClick={() => void claimDailyLogin()}
          >
            {busy
              ? "Mengambil…"
              : status?.claimedToday
                ? "Sudah diklaim hari ini"
                : `Klaim hari ke-${status?.currentDay ?? 1}`}
          </button>
        )}
      </div>
    </div>
  );
}
