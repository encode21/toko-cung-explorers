import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { rupiah } from "@/game/warung/model";
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
  const kasOpen = !!status?.kas?.hasWarung && !status.kas.claimedToday;
  const pointsOpen = !!status?.enabled && !status.claimedToday && !status.budgetExhausted;
  const claimable =
    !!status?.enabled && ((!status.claimedToday && !status.budgetExhausted) || kasOpen);
  const notice = !status
    ? "Memuat hadiah…"
    : !status.enabled
      ? "Event login harian sedang tidak aktif."
      : kasOpen
        ? "Kas usaha hari ini siap diklaim. Reset setiap 00.00 WIB."
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
          <p>Klaim Point dan Kas usaha setiap hari. Progres keduanya tetap tersimpan.</p>
        </div>
        <Gift className="daily-login-hero-gift" aria-hidden="true" />
      </div>
      <div className="daily-login-content">
        <ol className="daily-login-calendar" aria-label="Kalender hadiah login tujuh hari">
          {Array.from({ length: 7 }, (_, index) => {
            const day = status?.days?.[index];
            const today = day?.day === status?.currentDay;
            const pointState = day?.claimed
              ? "claimed"
              : today && pointsOpen
                ? "available"
                : "locked";
            const kas = status?.kas;
            const kasToday = !!kas?.hasWarung && kas.day === index + 1;
            const kasClaimed =
              !!kas?.hasWarung && (index + 1 < kas.day || (kasToday && kas.claimedToday));
            const kasState = kasClaimed ? "claimed" : kasToday && kasOpen ? "available" : "locked";
            const state =
              pointState === "available" || kasState === "available"
                ? "available"
                : pointState === "claimed" && (!kas?.hasWarung || kasClaimed)
                  ? "claimed"
                  : "locked";
            return (
              <li
                key={index}
                data-state={state}
                aria-current={today || kasToday ? "step" : undefined}
                className={`daily-login-day ${index === 6 ? "daily-login-day-final" : ""}`}
              >
                <h4>Hari ke-{index + 1}</h4>
                <div className="daily-login-gift">
                  <PointCoinIcon />
                  {day?.claimed ? (
                    <Check className="daily-login-stamp" aria-hidden="true" />
                  ) : (
                    pointState === "locked" && (
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
                      : pointState === "available"
                        ? "Klaim hari ini"
                        : "Terkunci"}
                </span>
                {kas && (
                  <div className="daily-login-kas" data-state={kasState}>
                    <span className="daily-login-kas-label">Kas usaha</span>
                    <strong>
                      <KasMoneyIcon className="daily-login-kas-icon" />{" "}
                      {rupiah(kas.schedule[index] ?? 0)}
                    </strong>
                    <small>
                      {!kas.hasWarung
                        ? "Buka warung dulu"
                        : kasClaimed
                          ? "✓ Sudah masuk"
                          : kasState === "available"
                            ? "Klaim hari ini"
                            : "Terkunci"}
                    </small>
                  </div>
                )}
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
            {busy ? "Mengambil…" : !claimable ? "Sudah diklaim hari ini" : "Klaim hadiah hari ini"}
          </button>
        )}
      </div>
    </div>
  );
}
