import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { ActionButton } from "@/ui/adventure/ActionButton";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { createGamePin, loginAccount, registerAccount, useSession } from "@/auth/useSession";
import { worldRequest, WorldApiError } from "@/services/world/client";
import { AppBridge } from "@/lib/app-bridge";
import { pageMeta } from "@/lib/site-meta";
export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: pageMeta({
      title: "Masuk Toko Cung World",
      description: "Daftar langsung dan bermain dengan PIN khusus game. Tidak perlu mengunduh App.",
      path: "/auth",
    }),
  }),
  component: AuthPage,
});
type Mode = "login" | "register" | "link" | "reset";
function AuthPage() {
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
  const inputClass =
    "mt-2 min-h-12 w-full rounded-lg border border-world-outline bg-[#1a0f10] px-3";
  return (
    <AdventureShell chapter="Identitas penjelajah">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <aside className="hidden lg:block">
          <p className="adventure-eyebrow">Petualangan dimulai dari sini</p>
          <h2 className="mt-5 font-display text-7xl leading-none">
            SATU DUNIA.
            <br />
            <span className="text-world-accent">CERITAMU SENDIRI.</span>
          </h2>
          <p className="mt-6 max-w-sm leading-7 text-world-muted">
            Bertemu Nakama, jelajahi lingkungan, dan temukan sesuatu yang baru di setiap perjalanan.
          </p>
          <p className="adventure-eyebrow mt-12">01 Identitas / 02 Channel / 03 Jelajah</p>
        </aside>
        <div className="adventure-panel mx-auto w-full max-w-lg">
          <p className="adventure-eyebrow mb-5">Player identity · 01</p>
          <div className="mb-6 flex gap-2" aria-label="Pilihan akun">
            {(["login", "register"] as const).map((tab) => (
              <button
                type="button"
                key={tab}
                disabled={busy || sending}
                onClick={() => changeMode(tab)}
                className={`min-h-11 flex-1 rounded-lg border px-3 text-sm ${mode === tab ? "border-world-brand/70 bg-world-brand/15 text-world-accent" : "border-world-outline text-world-muted"}`}
              >
                {tab === "login" ? "Masuk" : "Pemain Baru"}
              </button>
            ))}
          </div>
          <h1 className="font-display text-4xl">
            {mode === "register"
              ? "Mulai petualanganmu"
              : creating
                ? label
                : "Masuk Toko Cung World"}
          </h1>
          <p className="mt-3 text-sm text-world-muted">
            {mode === "register"
              ? "Belum pernah pakai Toko Cung? Daftar langsung di sini. Tidak perlu mengunduh App atau meminta kode aktivasi."
              : mode === "link"
                ? "Nomormu sudah tercatat di Toko Cung. Verifikasi lewat notifikasi App, lalu buat PIN khusus game. Akun dan data lamamu tetap sama."
                : mode === "reset"
                  ? "Verifikasi akun lewat notifikasi Toko Cung App, lalu buat PIN game baru. Progresmu tetap tersimpan."
                  : "Gunakan nomor telepon dan PIN khusus game. Baru pertama bermain? Daftar langsung di sini."}
          </p>
          <form
            className="mt-6 space-y-4"
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
            {mode === "register" && (
              <label className="block text-sm">
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
            <label className="block text-sm">
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
              <div className="space-y-3">
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
                      const result = await worldRequest<{ message: string; retryAfter: number }>(
                        "pin-request",
                        { phone, purpose: mode === "reset" ? "reset" : "setup" },
                      );
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
                <label className="block text-sm">
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
                <p className="text-xs text-world-muted">
                  Buka notifikasi pada perangkat yang terhubung ke akun Toko Cung ini. Kode push
                  berlaku 5 menit. Jika perangkat tidak dapat diakses, hubungi dukungan untuk
                  pemulihan akun.
                </p>
              </div>
            )}
            <label className="block text-sm">
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
              <label className="block text-sm">
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
            <ActionButton
              type="submit"
              busy={busy}
              busyLabel={
                mode === "login" ? "Masuk…" : mode === "register" ? "Mendaftar…" : "Menyimpan PIN…"
              }
              disabled={sending || session.loading}
              outcome={error ? "error" : undefined}
              className="w-full"
            >
              {label}
            </ActionButton>
          </form>
          <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {mode !== "login" && (
              <button
                disabled={busy || sending}
                onClick={() => changeMode("login")}
                className="min-h-11 underline"
              >
                Sudah punya PIN? Masuk
              </button>
            )}
            {mode !== "register" && (
              <button
                disabled={busy || sending}
                onClick={() => changeMode("register")}
                className="min-h-11 underline"
              >
                Baru di World? Daftar
              </button>
            )}
            {mode === "login" && (
              <button
                disabled={busy || sending}
                onClick={() => changeMode("link")}
                className="min-h-11 underline"
              >
                Punya akun App? Buat PIN game
              </button>
            )}
            {mode !== "reset" && (
              <button
                disabled={busy || sending}
                onClick={() => changeMode("reset")}
                className="min-h-11 underline"
              >
                Lupa PIN game?
              </button>
            )}
          </div>
          <p className="mt-5 text-sm text-world-muted">
            PIN 6 angka ini khusus untuk game. Akunmu juga bisa digunakan untuk berbelanja di Toko
            Cung App.
          </p>
          <AppBridge className="mt-2 inline-block text-sm underline" />
          <Link to="/" className="mt-5 block text-sm underline">
            Kembali ke halaman depan
          </Link>
        </div>
      </div>
    </AdventureShell>
  );
}
