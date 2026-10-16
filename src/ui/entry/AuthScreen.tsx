import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { ActionButton } from "@/ui/adventure/ActionButton";
import { EntryKeypad } from "@/ui/entry/EntryKeypad";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ClipboardEvent, type FocusEvent } from "react";
import { createGamePin, loginAccount, registerAccount, useSession } from "@/auth/useSession";
import { worldRequest, WorldApiError } from "@/services/world/client";
import { AppBridge } from "@/lib/app-bridge";

type Mode = "login" | "register" | "link" | "reset";
type NumericField = "phone" | "pin" | "confirmation" | "code";
type ActiveField = NumericField | "name" | null;

const FIELD_LIMIT: Record<NumericField, number> = {
  phone: 16,
  pin: 6,
  confirmation: 6,
  code: 48,
};

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
  const [activeField, setActiveField] = useState<ActiveField>(null);
  const creating = mode !== "login";
  const verifying = mode === "link" || mode === "reset";
  const locked = busy || sending;
  const keypadField: NumericField | null =
    activeField && activeField !== "name" ? activeField : null;
  const label =
    mode === "register"
      ? "Daftar & masuk"
      : mode === "link"
        ? "Buat PIN game"
        : mode === "reset"
          ? "Pulihkan PIN game"
          : "Masuk";

  const values: Record<NumericField, string> = { phone, pin, confirmation, code };
  const setters: Record<NumericField, (value: string) => void> = {
    phone: (value) => {
      setPhone(value);
      setCode("");
      setNotice("");
    },
    pin: setPin,
    confirmation: setConfirmation,
    code: setCode,
  };

  const changeMode = (next: Mode) => {
    setMode(next);
    setPin("");
    setConfirmation("");
    setCode("");
    setError("");
    setNotice("");
    setActiveField(null);
  };

  const appendDigit = (digit: string, field = keypadField) => {
    if (locked || !field) return;
    const current = values[field];
    if (current.length >= FIELD_LIMIT[field]) return;
    if (field !== "code" && !/^[0-9]$/.test(digit)) return;
    if (field === "code" && !/^[0-9a-f]$/i.test(digit)) return;
    setters[field](current + (field === "code" ? digit.toLowerCase() : digit));
  };

  const backspace = (field = keypadField) => {
    if (locked || !field) return;
    setters[field](values[field].slice(0, -1));
  };

  const clearField = (field = keypadField) => {
    if (locked || !field) return;
    setters[field]("");
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

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (locked || !keypadField) return;
      const target = event.target;
      if (target instanceof HTMLInputElement && !target.readOnly) return;
      if (event.key >= "0" && event.key <= "9") {
        event.preventDefault();
        appendDigit(event.key, keypadField);
      } else if (/^[a-f]$/i.test(event.key) && keypadField === "code") {
        event.preventDefault();
        appendDigit(event.key, keypadField);
      } else if (event.key === "Backspace") {
        event.preventDefault();
        backspace(keypadField);
      } else if (event.key === "Escape") {
        event.preventDefault();
        clearField(keypadField);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const blurNumeric = (event: FocusEvent<HTMLInputElement>) => {
    const next = event.relatedTarget;
    if (next instanceof HTMLElement) {
      if (next.closest(".entry-keypad-dock")) return;
      if (next.matches("[data-entry-keypad]")) return;
      if (next.matches(".entry-input:not([data-entry-keypad])")) {
        setActiveField("name");
        return;
      }
    }
    // Keep keypad while pressing a key (mousedown preventDefault); clear after true blur.
    window.setTimeout(() => {
      const focused = document.activeElement;
      if (focused instanceof HTMLElement) {
        if (focused.closest(".entry-keypad-dock")) return;
        if (focused.matches("[data-entry-keypad]")) return;
        if (focused.matches(".entry-input:not([data-entry-keypad])")) {
          setActiveField("name");
          return;
        }
      }
      setActiveField(null);
    }, 0);
  };

  const numericProps = (field: NumericField) => ({
    readOnly: true as const,
    inputMode: "none" as const,
    enterKeyHint: "done" as const,
    autoCorrect: "off" as const,
    spellCheck: false,
    "data-entry-keypad": field,
    "aria-describedby": keypadField === field ? "entry-keypad" : undefined,
    className: `entry-input entry-input-keypad${activeField === field ? " is-active" : ""}`,
    disabled: locked,
    onFocus: () => setActiveField(field),
    onClick: () => setActiveField(field),
    onBlur: blurNumeric,
    onPaste: (event: ClipboardEvent<HTMLInputElement>) => {
      event.preventDefault();
      const raw = event.clipboardData.getData("text");
      const cleaned =
        field === "code"
          ? raw.replace(/[^0-9a-f]/gi, "").toLowerCase()
          : raw.replace(/\D/g, "");
      setters[field](cleaned.slice(0, FIELD_LIMIT[field]));
      setActiveField(field);
    },
  });

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
                <button type="button" disabled={locked} onClick={() => changeMode("link")}>
                  Punya akun App? Buat PIN game
                </button>
                <button type="button" disabled={locked} onClick={() => changeMode("reset")}>
                  Lupa PIN game?
                </button>
              </>
            ) : (
              <button type="button" disabled={locked} onClick={() => changeMode("login")}>
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
                  disabled={locked}
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
              if (locked) return;
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
                  <label className="entry-field entry-field-name">
                    Nama pemain
                    <input
                      autoComplete="nickname"
                      value={name}
                      required
                      maxLength={18}
                      disabled={locked}
                      onChange={(e) => setName(e.target.value)}
                      onFocus={() => setActiveField("name")}
                      className="entry-input"
                    />
                  </label>
                )}
                <label className="entry-field">
                  Nomor telepon
                  <input
                    autoComplete="tel"
                    type="text"
                    value={phone}
                    required
                    maxLength={16}
                    {...numericProps("phone")}
                  />
                </label>
                {verifying && (
                  <div className="entry-verification">
                    <ActionButton
                      type="button"
                      busy={sending}
                      busyLabel="Mengirim kode…"
                      disabled={busy || cooldown > 0 || !phone}
                      className="entry-verify-send"
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
                          setActiveField("code");
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
                        value={code}
                        pattern="(?:[0-9]{6}|[a-f0-9]{48})"
                        required
                        maxLength={48}
                        autoCapitalize="none"
                        {...numericProps("code")}
                      />
                    </label>
                  </div>
                )}
                <label className="entry-field">
                  {creating ? "PIN game baru" : "PIN game"}
                  <input
                    autoComplete={creating ? "new-password" : "current-password"}
                    type="password"
                    value={pin}
                    required
                    pattern="[0-9]{6}"
                    minLength={6}
                    maxLength={6}
                    {...numericProps("pin")}
                  />
                </label>
                {creating && (
                  <label className="entry-field">
                    Konfirmasi PIN game
                    <input
                      autoComplete="new-password"
                      type="password"
                      value={confirmation}
                      required
                      pattern="[0-9]{6}"
                      minLength={6}
                      maxLength={6}
                      {...numericProps("confirmation")}
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
            {keypadField && (
              <div id="entry-keypad" className="entry-keypad-dock">
                <p className="entry-keypad-hint">
                  {keypadField === "phone"
                    ? "Nomor telepon · pakai keypad"
                    : keypadField === "code"
                      ? "Kode · angka (tempel bila token panjang)"
                      : keypadField === "confirmation"
                        ? "Konfirmasi PIN · 6 angka"
                        : "PIN game · 6 angka"}
                </p>
                <EntryKeypad
                  disabled={locked}
                  onDigit={(digit) => appendDigit(digit)}
                  onBackspace={() => backspace()}
                  onClear={() => clearField()}
                />
              </div>
            )}
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
