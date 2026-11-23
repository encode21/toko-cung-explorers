import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { loginAsGuest, useSession } from "@/auth/useSession";
import { EntryTitleScreen } from "./EntryTitleScreen";

export function LandingScreen() {
  const { user, loading } = useSession();
  const [guestBusy, setGuestBusy] = useState(false);
  const [guestError, setGuestError] = useState("");
  const guestPending = useRef(false);
  const navigate = useNavigate();
  const tryAsGuest = async () => {
    if (loading || user || guestPending.current) return;
    guestPending.current = true;
    setGuestBusy(true);
    setGuestError("");
    try {
      await loginAsGuest();
      await navigate({ to: "/world" });
    } catch (e) {
      setGuestError(e instanceof Error ? e.message : "Mode tamu belum bisa dibuka. Coba lagi.");
    } finally {
      guestPending.current = false;
      setGuestBusy(false);
    }
  };
  const preparing = loading || guestBusy;
  return (
    <EntryTitleScreen
      status={loading ? "Memuat sesi pemain…" : guestBusy ? "Menyiapkan profil…" : undefined}
      error={guestError}
    >
      {!preparing && (
        <>
          <div className="entry-start-actions" aria-label="Mulai bermain">
            <Link className="adventure-button entry-title-primary" to={user ? "/world" : "/auth"}>
              {user ? "Lanjutkan bermain" : "Masuk"}
            </Link>
            {!user && (
              <button
                type="button"
                className="adventure-button adventure-secondary entry-title-guest"
                aria-describedby="entry-guest-details"
                onClick={() => void tryAsGuest()}
              >
                Coba sebagai tamu
              </button>
            )}
          </div>
          <span id="entry-guest-details" className="sr-only">
            Tanpa akun. Progres tamu hilang dalam 24 jam.
          </span>
        </>
      )}
    </EntryTitleScreen>
  );
}
