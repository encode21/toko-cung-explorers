import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { EntryTitleScreen } from "@/ui/entry/EntryTitleScreen";
import { loginWithAppHandoff } from "@/auth/useSession";

/**
 * Toko Cung App WebView entry: `/app-login#code=<one-time code>`.
 * The fragment never reaches the server; the code is single-use and expires in 60s.
 */
export const Route = createFileRoute("/app-login")({
  ssr: false,
  component: AppLoginPage,
});

function AppLoginPage() {
  const navigate = useNavigate();
  const started = useRef(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const code = new URLSearchParams(window.location.hash.slice(1)).get("code") ?? "";
    window.history.replaceState(null, "", window.location.pathname);
    if (!/^[a-f0-9]{48}$/.test(code)) {
      void navigate({ to: "/auth", replace: true });
      return;
    }
    loginWithAppHandoff(code)
      .then(() => navigate({ to: "/world", replace: true }))
      .catch((e) => setError(e instanceof Error ? e.message : "Gagal masuk dari App."));
  }, [navigate]);

  return (
    <EntryTitleScreen status={error ? undefined : "Masuk dengan akun Toko Cung App…"} error={error}>
      {error && (
        <div className="entry-start-actions">
          <Link to="/auth" replace className="adventure-button entry-title-primary">
            Masuk dengan PIN game
          </Link>
        </div>
      )}
    </EntryTitleScreen>
  );
}
