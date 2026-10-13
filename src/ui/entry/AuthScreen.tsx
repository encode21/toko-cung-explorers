import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { ActionButton } from "@/ui/adventure/ActionButton";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createGamePin, loginAccount, registerAccount, useSession } from "@/auth/useSession";
import { worldRequest, WorldApiError } from "@/services/world/client";
import { AppBridge } from "@/lib/app-bridge";
type Mode = "login" | "register" | "link" | "reset";
export function AuthScreen() {
  const session = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const creating = mode !== "login";
  const verifying = mode === "link" || mode === "reset";
  const label =
    mode === "register"
      ? "Daftar & masuk"
      : mode === "link"
        ? "Buat PIN game"
        : mode === "reset"
          ? "Pulihkan PIN game"
          : "Masuk";
  const changeMode = (next: Mode) => {
    setMode(next);
    setPin("");
    setConfirmation("");
    setCode("");
    setError("");
    setNotice("");
  };
  useEffect(() => {
    if (session.user) void navigate({ to: "/world", replace: true });
  }, [session.user, navigate]);
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((n) => Math.max(0, n - 1)), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);
  useEffect(() => {
    let frame = 0;
    const keepInputVisible = () => {
      cancelAnimationFrame(frame);
      // Wait for the viewport hook and keyboard layout to settle before scrolling the form.
      frame = requestAnimationFrame(() => {
        frame = requestAnimationFrame(() => {
          const input = document.activeElement;
          if (!(input instanceof HTMLInputElement) || !input.matches(".entry-input")) return;
          const area = input.closest<HTMLElement>(".entry-form-scroll");
          if (!area) return;
          const field = input.getBoundingClientRect();
          const bounds = area.getBoundingClientRect();
          if (field.bottom > bounds.bottom - 8) area.scrollTop += field.bottom - bounds.bottom + 8;
          else if (field.top < bounds.top + 8) area.scrollTop -= bounds.top - field.top + 8;
        });
      });
    };
    window.visualViewport?.addEventListener("resize", keepInputVisible);
    document.addEventListener("focusin", keepInputVisible);
    return () => {
      cancelAnimationFrame(frame);
      window.visualViewport?.removeEventListener("resize", keepInputVisible);
      document.removeEventListener("focusin", keepInputVisible);
    };
  }, []);
  const inputClass = "entry-input";
  return (
    <AdventureShell chapter="Identitas penjelajah" entry>
      <div className="entry-auth-layout">
        <aside className="entry-intro">
          <div>
            <p className="adventure-eyebrow">Identitas · 01</p>
            <h1>
              {mode === "register"
                ? "Mulai petualanganmu"
                : creating
                  ? label
                  : "Selamat datang kembali"}
            </h1>
            <p>
              {mode === "register"
                ? "Buat akun di sini, lalu pilih channel dan mulai menjelajah. Tidak perlu mengunduh App."
                : verifying
                  ? "Kirim kode ke notifikasi Toko Cung App, lalu atur PIN game. Progresmu tetap tersimpan."
                  : "Masuk dengan nomor telepon dan PIN game untuk melanjutkan ceritamu."}
            </p>
            {verifying && (
              <p className="entry-verification-help">
                Kode berlaku 5 menit. Tidak bisa mengakses perangkat terhubung? Hubungi dukungan
                untuk pemulihan akun.
              </p>
            )}
          </div>
          <nav className="entry-account-links" aria-label="Bantuan akun">
            {!verifying ? (
              <>
                <button disabled={busy || sending} onClick={() => changeMode("link")}>
                  Punya akun App? Buat PIN game
                </button>
                <button disabled={busy || sending} onClick={() => changeMode("reset")}>
                  Lupa PIN game?
                </button>
              </>
            ) : (
              <button disabled={busy || sending} onClick={() => changeMode("login")}>
                ← Kembali ke masuk
              </button>
            )}
            <AppBridge />
            <Link to="/">← Halaman depan</Link>
          </nav>
        </aside>
        <section className="entry-auth-panel" aria-label="Identitas pemain">
          <header className="entry-auth-header">
            <div className="entry-account-tabs" aria-label="Pilihan akun">
              {(["login", "register"] as const).map((tab) => (
                <button
                  type="button"
                  key={tab}
                  disabled={busy || sending}
                  aria-pressed={mode === tab}
                  onClick={() => changeMode(tab)}
                >
                  {tab === "login" ? "Masuk" : "Pemain Baru"}
                </button>
              ))}
            </div>
            {verifying && <strong>{label}</strong>}
          </header>
          <form
            className="entry-auth-form"
            onSubmit={async (e) => {
              e.preventDefault();
              if (busy || sending) return;
              setError("");
              setNotice("");
              if (creating && pin !== confirmation) {
                setError("Konfirmasi PIN tidak sama.");
                return;
              }
              setBusy(true);
              try {
                if (mode === "register")
                  await registerAccount(name.trim(), phone, pin, confirmation);
                else if (verifying)
                  await createGamePin(phone, code.trim(), pin, confirmation, mode === "reset");
                else await loginAccount(phone, pin);
                setPin("");
                setConfirmation("");
                setCode("");
              } catch (e) {
                if (mode === "register" && e instanceof WorldApiError && e.status === 409) {
                  setMode("link");
                  setCode("");
                  setNotice(
                    "Nomor sudah terdaftar. Kirim kode verifikasi ke notifikasi App untuk membuat PIN game.",
                  );
                } else setError(e instanceof Error ? e.message : "Gagal masuk.");
              } finally {
                setBusy(false);
              }
            }}
          >
            <div className="entry-form-scroll">
              <div className="entry-fields">
                {mode === "register" && (
                  <label className="entry-field">
                    Nama pemain
                    <input
                      autoComplete="nickname"
                      value={name}
                      required
                      maxLength={18}
                      disabled={busy || sending}
                      onChange={(e) => setName(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                )}
                <label className="entry-field">
                  Nomor telepon
                  <input
                    autoComplete="tel"
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    required
                    maxLength={16}
                    disabled={busy || sending}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setCode("");
                      setNotice("");
                    }}
                    className={inputClass}
                  />
                </label>
                {verifying && (
                  <div className="entry-verification">
                    <ActionButton
                      type="button"
                      busy={sending}
                      busyLabel="Mengirim kode…"
                      disabled={busy || cooldown > 0 || !phone}
                      className="min-h-11 w-full rounded-lg border border-world-outline px-3 text-sm disabled:opacity-50"
                      onClick={async () => {
                        setSending(true);
                        setError("");
                        setNotice("");
                        try {
                          const result = await worldRequest<{
                            message: string;
                            retryAfter: number;
                          }>("pin-request", {
                            phone,
                            purpose: mode === "reset" ? "reset" : "setup",
                          });
                          setNotice(result.message);
                          setCooldown(result.retryAfter);
                        } catch (e) {
                          setError(e instanceof Error ? e.message : "Kode belum terkirim.");
                        } finally {
                          setSending(false);
                        }
                      }}
                    >
                      {cooldown > 0
                        ? `Kirim ulang dalam ${cooldown} dtk`
                        : "Kirim kode ke notifikasi App"}
                    </ActionButton>
                    <label className="entry-field">
                      Kode verifikasi
                      <input
                        autoComplete="one-time-code"
                        type="text"
                        inputMode="numeric"
                        value={code}
                        pattern="(?:[0-9]{6}|[a-f0-9]{48})"
                        required
                        maxLength={48}
                        autoCapitalize="none"
                        spellCheck={false}
                        disabled={busy || sending}
                        onChange={(e) => setCode(e.target.value.trim())}
                        className={inputClass}
                      />
                    </label>
                  </div>
                )}
                <label className="entry-field">
                  {creating ? "PIN game baru" : "PIN game"}
                  <input
                    autoComplete={creating ? "new-password" : "current-password"}
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    required
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    disabled={busy || sending}
                    onChange={(e) => setPin(e.target.value)}
                    className={inputClass}
                  />
                </label>
                {creating && (
                  <label className="entry-field">
                    Konfirmasi PIN game
                    <input
                      autoComplete="new-password"
                      type="password"
                      inputMode="numeric"
                      value={confirmation}
                      required
                      pattern="[0-9]{6}"
                      minLength={6}
                      maxLength={6}
                      disabled={busy || sending}
                      onChange={(e) => setConfirmation(e.target.value)}
                      className={inputClass}
                    />
                  </label>
                )}
              </div>
              {notice && (
                <p role="status" className="text-sm">
                  {notice}
                </p>
              )}
              {(error || session.error) && (
                <p role="alert" className="text-sm">
                  {error || session.error}
                </p>
              )}
            </div>
            <footer className="entry-form-footer">
              <span>PIN game · 6 angka</span>
              <ActionButton
                type="submit"
                busy={busy}
                busyLabel={
                  mode === "login"
                    ? "Masuk…"
                    : mode === "register"
                      ? "Mendaftar…"
                      : "Menyimpan PIN…"
                }
                disabled={sending || session.loading}
                outcome={error ? "error" : undefined}
                className="entry-submit"
              >
                {label}
              </ActionButton>
            </footer>
          </form>
        </section>
      </div>
    </AdventureShell>
  );
}
