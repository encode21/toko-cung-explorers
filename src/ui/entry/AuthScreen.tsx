import { AdventureShell } from "@/ui/adventure/AdventureShell";
import { ActionButton } from "@/ui/adventure/ActionButton";
import { EntryKeypad } from "@/ui/entry/EntryKeypad";
import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState, type ClipboardEvent, type FocusEvent } from "react";
import { createGamePin, loginAccount, registerAccount, useSession } from "@/auth/useSession";
import { worldRequest, WorldApiError } from "@/services/world/client";
import { X } from "lucide-react";
import "./auth.css";

type Mode = "login" | "register" | "link" | "reset";
type NumericField = "phone" | "pin" | "confirmation" | "code";
type ActiveField = NumericField | "name" | null;

const FIELD_LIMIT: Record<NumericField, number> = {
  phone: 16,
  pin: 6,
  confirmation: 6,
  code: 48,
};

export function AuthScreen({ initialMode = "login" }: { initialMode?: "login" | "register" }) {
  const session = useSession();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(initialMode);
  const guestSignup = initialMode === "register" && !!session.user?.guest;
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
  const [verificationRequested, setVerificationRequested] = useState(false);
  const pending = useRef(false);
  const messageRef = useRef<HTMLParagraphElement>(null);
  const creating = mode !== "login";
  const verifying = mode === "link" || mode === "reset";
  const locked = busy || sending || session.loading;
  const keypadField: NumericField | null =
    activeField && activeField !== "name" ? activeField : null;
  const title =
    mode === "register"
      ? "Daftar baru"
      : mode === "link"
        ? "Buat PIN game"
        : mode === "reset"
          ? "Atur ulang PIN"
          : "Masuk";
  const label = verifying
    ? verificationRequested
      ? "Simpan PIN"
      : "Kirim kode ke App"
    : mode === "register"
      ? "Daftar & masuk"
      : "Masuk";
  const phoneValid = /^[0-9]{9,16}$/.test(phone);

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
    setVerificationRequested(false);
    setPin("");
    setConfirmation("");
    setCode("");
    setError("");
    setNotice("");
    setActiveField(null);
  };

  const requestCode = async () => {
    if (locked || pending.current || cooldown > 0) return;
    setError("");
    setNotice("");
    if (!phoneValid) {
      setError("Masukkan nomor telepon yang valid, 9–16 angka.");
      return;
    }
    pending.current = true;
    setSending(true);
    try {
      const result = await worldRequest<{ message: string; retryAfter: number }>("pin-request", {
        phone,
        purpose: mode === "reset" ? "reset" : "setup",
      });
      setNotice(result.message);
      setCooldown(result.retryAfter);
      setVerificationRequested(true);
      setActiveField(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Kode belum terkirim. Coba lagi.");
    } finally {
      pending.current = false;
      setSending(false);
    }
  };

  useEffect(() => {
    messageRef.current?.scrollIntoView({ block: "nearest" });
  }, [error, notice]);

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
    if (session.user && !guestSignup) void navigate({ to: "/world", replace: true });
  }, [session.user, guestSignup, navigate]);

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
      if (next.matches("button, a, summary") && next.closest(".entry-auth-panel")) return;
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
        if (focused.matches("button, a, summary") && focused.closest(".entry-auth-panel")) return;
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
        field === "code" ? raw.replace(/[^0-9a-f]/gi, "").toLowerCase() : raw.replace(/\D/g, "");
      setters[field](cleaned.slice(0, FIELD_LIMIT[field]));
      setActiveField(field);
    },
  });

  return (
    <AdventureShell chapter="" entry allowPortrait chrome={false} className="entry-account-shell">
      <section
        className="entry-auth-panel"
        aria-labelledby="auth-title"
        data-mode={mode}
        onMouseDownCapture={(event) => {
          // Keep the keypad layout stable until the pressed control receives its click.
          if (
            keypadField &&
            event.target instanceof Element &&
            event.target.closest("button, a, summary")
          ) {
            event.preventDefault();
          }
        }}
      >
        <header className="entry-auth-header">
          <h1 id="auth-title">{title}</h1>
          <Link
            to={guestSignup ? "/world" : "/"}
            className="entry-auth-close"
            aria-label={guestSignup ? "Kembali ke dunia" : "Kembali ke halaman depan"}
            disabled={locked}
          >
            <X aria-hidden />
          </Link>
        </header>
        <form
          className="entry-auth-form"
          onSubmit={async (e) => {
            e.preventDefault();
            if (locked || pending.current) return;
            setActiveField(null);
            if (verifying && !verificationRequested) {
              await requestCode();
              return;
            }
            setError("");
            setNotice("");
            if (mode === "register" && !name.trim()) {
              setError("Isi nama pemain terlebih dahulu.");
              return;
            }
            if (!phoneValid) {
              setError("Masukkan nomor telepon yang valid, 9–16 angka.");
              return;
            }
            if (verifying && !/^(?:[0-9]{6}|[a-f0-9]{48})$/.test(code.trim())) {
              setError("Masukkan kode verifikasi dari notifikasi App.");
              return;
            }
            if (!/^[0-9]{6}$/.test(pin)) {
              setError("PIN game harus berisi 6 angka.");
              return;
            }
            if (creating && pin !== confirmation) {
              setError("Konfirmasi PIN tidak sama.");
              return;
            }
            pending.current = true;
            setBusy(true);
            try {
              if (mode === "register") await registerAccount(name.trim(), phone, pin, confirmation);
              else if (verifying)
                await createGamePin(phone, code.trim(), pin, confirmation, mode === "reset");
              else await loginAccount(phone, pin);
              setPin("");
              setConfirmation("");
              setCode("");
            } catch (e) {
              if (mode === "register" && e instanceof WorldApiError && e.status === 409) {
                setMode("link");
                setVerificationRequested(false);
                setActiveField(null);
                setCode("");
                setNotice(
                  "Nomor sudah terdaftar di Toko Cung App. Kirim kode untuk membuat PIN game.",
                );
              } else setError(e instanceof Error ? e.message : "Gagal masuk. Coba lagi.");
            } finally {
              pending.current = false;
              setBusy(false);
            }
          }}
        >
          <div className="entry-form-scroll">
            {verifying && (
              <div className="entry-auth-context">
                <p>
                  {verificationRequested
                    ? "Masukkan kode dari notifikasi App atau dukungan Toko Cung."
                    : "Kode dikirim ke notifikasi Toko Cung App dan berlaku 5 menit."}
                </p>
                {verificationRequested && (
                  <div className="entry-verified-phone">
                    <span>{phone}</span>
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        setVerificationRequested(false);
                        setCode("");
                        setPin("");
                        setConfirmation("");
                        setNotice("");
                        setError("");
                        setActiveField(null);
                      }}
                    >
                      Ubah nomor
                    </button>
                  </div>
                )}
              </div>
            )}
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
              {(!verifying || !verificationRequested) && (
                <label className="entry-field">
                  Nomor telepon
                  <input
                    autoComplete="tel"
                    type="text"
                    value={phone}
                    required
                    maxLength={16}
                    placeholder="08…"
                    {...numericProps("phone")}
                  />
                </label>
              )}
              {verifying && verificationRequested && (
                <label className="entry-field">
                  Kode verifikasi
                  <input
                    autoComplete="one-time-code"
                    type="text"
                    value={code}
                    required
                    maxLength={48}
                    autoCapitalize="none"
                    placeholder="Kode dari notifikasi App"
                    {...numericProps("code")}
                  />
                </label>
              )}
              {(!verifying || verificationRequested) && (
                <>
                  <label className="entry-field">
                    {creating ? "PIN game baru" : "PIN game"}
                    <input
                      autoComplete={creating ? "new-password" : "current-password"}
                      type="password"
                      value={pin}
                      required
                      minLength={6}
                      maxLength={6}
                      placeholder="6 angka"
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
                        minLength={6}
                        maxLength={6}
                        placeholder="Ulangi PIN"
                        {...numericProps("confirmation")}
                      />
                    </label>
                  )}
                </>
              )}
            </div>
            {mode === "login" && (
              <button
                type="button"
                className="entry-forgot-pin"
                disabled={locked}
                onClick={() => changeMode("reset")}
              >
                Lupa PIN game?
              </button>
            )}
            {verifying && verificationRequested && (
              <button
                type="button"
                className="entry-resend-code"
                disabled={locked || cooldown > 0}
                onClick={() => void requestCode()}
              >
                {cooldown > 0 ? `Kirim ulang dalam ${cooldown} dtk` : "Kirim ulang kode"}
              </button>
            )}
            {(error || session.error || notice) && (
              <p ref={messageRef} role={error || session.error ? "alert" : "status"}>
                {error || session.error || notice}
              </p>
            )}
            {verifying && !verificationRequested && (
              <details className="entry-recovery-help">
                <summary>Tidak bisa membuka App?</summary>
                <p>Hubungi dukungan Toko Cung untuk pemulihan akun.</p>
                <button
                  type="button"
                  className="entry-recovery-code"
                  disabled={locked}
                  onClick={() => {
                    if (!phoneValid) {
                      setError("Masukkan nomor telepon yang valid, 9–16 angka.");
                      return;
                    }
                    setVerificationRequested(true);
                    setActiveField(null);
                    setError("");
                    setNotice("");
                  }}
                >
                  Sudah punya kode pemulihan
                </button>
              </details>
            )}
          </div>
          {keypadField && (
            <div id="entry-keypad" className="entry-keypad-dock">
              <p className="entry-keypad-hint">
                {keypadField === "phone"
                  ? "Nomor telepon"
                  : keypadField === "code"
                    ? "Kode verifikasi"
                    : keypadField === "confirmation"
                      ? "Konfirmasi PIN"
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
            <ActionButton
              type="submit"
              busy={busy || sending || session.loading}
              busyLabel={
                session.loading
                  ? "Memuat…"
                  : sending
                    ? "Mengirim kode…"
                    : mode === "login"
                      ? "Masuk…"
                      : mode === "register"
                        ? "Mendaftar…"
                        : "Menyimpan PIN…"
              }
              disabled={verifying && !verificationRequested && cooldown > 0}
              outcome={error ? "error" : undefined}
              showIcon={false}
              className="entry-submit w-full"
            >
              {verifying && !verificationRequested && cooldown > 0
                ? `Kirim ulang dalam ${cooldown} dtk`
                : label}
            </ActionButton>
            <nav className="entry-auth-options" aria-label="Pilihan akun">
              {mode === "login" ? (
                <>
                  <p>
                    Belum punya akun?{" "}
                    <button type="button" disabled={locked} onClick={() => changeMode("register")}>
                      Daftar baru
                    </button>
                  </p>
                  <button type="button" disabled={locked} onClick={() => changeMode("link")}>
                    Punya akun App? Buat PIN game
                  </button>
                </>
              ) : (
                <button type="button" disabled={locked} onClick={() => changeMode("login")}>
                  Kembali ke masuk
                </button>
              )}
            </nav>
          </footer>
        </form>
      </section>
    </AdventureShell>
  );
}
