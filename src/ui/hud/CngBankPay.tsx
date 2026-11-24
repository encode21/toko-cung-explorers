import { useEffect, useRef, useState } from "react";
import { basketTotal } from "@/game/warung/agen";
import { rupiah } from "@/game/warung/model";
import { deliveryFee, payBasket, useWarung } from "@/game/warung/store";
import { useHud } from "@/state/hud-store";
import {
  isPayMethod,
  nextStep,
  PAY_METHODS,
  PIN_LENGTH,
  pinComplete,
  pushPin,
  type PayMethod,
  type PayStep,
} from "./cngbank-pay.ts";
import "./warung-panel.css";
import "./cngbank-pay.css";

const KEY = "cngbank-pay-method";
const REKENING = "CngBank 1234 5678 90";
const VA = "8808 1234 5678 9012";
const METHOD_LABEL: Record<PayMethod, string> = {
  qris: "QRIS",
  transfer: "Transfer",
  va: "Virtual Account",
};
const MODE_LABEL = { ambil: "Bawa sendiri", antar: "Diantar" } as const;

function lastMethod(): PayMethod {
  try {
    const v = localStorage.getItem(KEY);
    if (isPayMethod(v)) return v;
  } catch {
    /* storage blocked: fall back to QRIS */
  }
  return "qris";
}

/** 9x9 fake QR: three finder squares plus a fixed pseudo-random fill. */
const QR_CELLS = Array.from({ length: 81 }, (_, i) => {
  const x = i % 9;
  const y = Math.floor(i / 9);
  const finder = (cx: number, cy: number) => x >= cx && x < cx + 3 && y >= cy && y < cy + 3;
  return finder(0, 0) || finder(6, 0) || finder(0, 6) || (i * 7 + (i >> 2)) % 3 === 0;
});

function Qr() {
  return (
    <svg viewBox="0 0 9 9" className="cngpay-qr" role="img" aria-label="Kode QRIS Toko Cung">
      <rect width="9" height="9" fill="#fff" />
      {QR_CELLS.map((on, i) =>
        on ? <rect key={i} x={i % 9} y={Math.floor(i / 9)} width="1" height="1" /> : null,
      )}
    </svg>
  );
}

/** Auto-advances after `ms` unless the player taps "Lewati" or the action itself. */
function useAutoAdvance(on: boolean, ms: number, go: () => void) {
  const ref = useRef(go);
  ref.current = go;
  useEffect(() => {
    if (!on) return;
    const t = setTimeout(() => ref.current(), ms);
    return () => clearTimeout(t);
  }, [on, ms]);
}

export function CngBankPay() {
  const basket = useWarung((s) => s.basket);
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const [method, setMethod] = useState<PayMethod>(lastMethod);
  const [mode, setMode] = useState<"ambil" | "antar">("ambil");
  const [step, setStep] = useState<PayStep>("method");
  const [scanned, setScanned] = useState(false);
  const [copied, setCopied] = useState(false);
  const [left, setLeft] = useState(900);
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [receipt, setReceipt] = useState<{ total: number; at: Date; ref: string } | null>(null);
  const [paying, setPaying] = useState(false);
  const submitting = useRef(false);
  // The basket empties on success, so the amount is frozen at the first render with items.
  const frozen = useRef(0);
  const goods = basket.length ? basketTotal(basket, data) : frozen.current;
  frozen.current = goods;
  const total = goods + (mode === "antar" ? deliveryFee(goods) : 0);

  const go = () => setStep((s) => nextStep(method, s));
  const pick = (m: PayMethod) => {
    setMethod(m);
    try {
      localStorage.setItem(KEY, m);
    } catch {
      /* ignore */
    }
    setStep(m);
  };

  useAutoAdvance(step === "qris" && !scanned, 2600, () => setScanned(true));
  useAutoAdvance(step === "qris" && scanned, 1200, go);
  useEffect(() => {
    if (step !== "va") return;
    const t = setInterval(() => setLeft((n) => Math.max(0, n - 1)), 1000);
    return () => clearInterval(t);
  }, [step]);

  const submit = async () => {
    if (submitting.current || busy) return;
    submitting.current = true;
    setPaying(true);
    setError(null);
    setStep("receipt");
    const paid = total;
    const ok = await payBasket(mode);
    submitting.current = false;
    setPaying(false);
    if (!ok) {
      setError(useWarung.getState().error ?? "Pembayaran belum berhasil.");
      return;
    }
    setReceipt({
      total: paid,
      at: new Date(),
      ref: `CNG${Date.now().toString(36).toUpperCase().slice(-8)}`,
    });
    useHud.getState().pushEvent("Makasih, Kak! Struknya mau?", "npc", "Kasir Toko Cung");
  };

  const tapPin = (d: string) => {
    if (step !== "pin") return;
    const next = pushPin(pin, d);
    setPin(next);
    if (pinComplete(next)) {
      setPin("");
      void submit();
    }
  };

  const close = () => {
    useHud.getState().setCngBankPay(false);
    useHud.getState().setSheet(null);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(REKENING.replace("CngBank ", "").replace(/ /g, ""));
      setCopied(true);
    } catch {
      /* clipboard unavailable: number stays visible */
    }
  };
  const skip = (
    <button type="button" className="cngpay-skip" onClick={go}>
      Lewati
    </button>
  );

  return (
    <div className="warung-panel cngpay" data-cngbank-pay={step}>
      <div className="warung-panel-body">
        <div className="warung-list">
          <section className="warung-card cngbank-card">
            <small>Bayar Belanja · Kasir Toko Cung</small>
            <strong>{rupiah(total)}</strong>
          </section>

          {step === "method" && (
            <section className="warung-card">
              <div className="cngpay-row" role="group" aria-label="Pengambilan">
                {(["ambil", "antar"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    className="warung-secondary"
                    aria-pressed={mode === m}
                    onClick={() => setMode(m)}
                  >
                    {MODE_LABEL[m]}
                    {m === "antar" && ` +${rupiah(deliveryFee(goods))}`}
                  </button>
                ))}
              </div>
              <p className="warung-hint">Pilih cara bayar</p>
              {PAY_METHODS.map((m) => (
                <button
                  key={m}
                  type="button"
                  className="warung-cta"
                  aria-pressed={m === method}
                  disabled={!goods}
                  onClick={() => pick(m)}
                >
                  {METHOD_LABEL[m]}
                  {m === method ? " · terakhir" : ""}
                </button>
              ))}
            </section>
          )}

          {step === "qris" && (
            <section className="warung-card cngpay-center">
              <div className="cngpay-scan" data-done={scanned || undefined}>
                <Qr />
                {!scanned && <i className="cngpay-line" />}
              </div>
              <strong>{scanned ? "Scan berhasil" : "Memindai QRIS…"}</strong>
              {!scanned && (
                <button type="button" className="cngpay-skip" onClick={() => setScanned(true)}>
                  Lewati
                </button>
              )}
            </section>
          )}

          {step === "transfer" && (
            <section className="warung-card cngpay-center">
              <small>Transfer ke</small>
              <strong>{REKENING}</strong>
              <span>a.n. Toko Cung</span>
              <button type="button" className="warung-secondary" onClick={() => void copy()}>
                {copied ? "Tersalin" : "Salin"}
              </button>
              <button type="button" className="warung-cta" onClick={go}>
                Sudah transfer
              </button>
              {skip}
            </section>
          )}

          {step === "va" && (
            <section className="warung-card cngpay-center">
              <small>Virtual Account Toko Cung</small>
              <strong>{VA}</strong>
              <span>
                Bayar dalam {String(Math.floor(left / 60)).padStart(2, "0")}:
                {String(left % 60).padStart(2, "0")}
              </span>
              <button type="button" className="warung-cta" onClick={go}>
                Bayar
              </button>
              {skip}
            </section>
          )}

          {step === "pin" && (
            <section className="warung-card cngpay-center">
              <strong>Masukkan PIN</strong>
              <div className="cngpay-dots" aria-label={`${pin.length} dari ${PIN_LENGTH} digit`}>
                {Array.from({ length: PIN_LENGTH }, (_, i) => (
                  <i key={i} data-on={i < pin.length || undefined} />
                ))}
              </div>
              <div className="cngpay-pad">
                {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "⌫"].map((d, i) =>
                  d ? (
                    <button
                      key={i}
                      type="button"
                      onClick={() => (d === "⌫" ? setPin(pin.slice(0, -1)) : tapPin(d))}
                    >
                      {d}
                    </button>
                  ) : (
                    <span key={i} />
                  ),
                )}
              </div>
              <button type="button" className="cngpay-skip" onClick={() => void submit()}>
                Lewati
              </button>
            </section>
          )}

          {step === "receipt" && (
            <section className="warung-card cngpay-center">
              {paying && <strong>Memproses…</strong>}
              {error && (
                <>
                  <strong>Pembayaran gagal</strong>
                  <p className="warung-hint">{error}</p>
                  <button type="button" className="warung-cta" onClick={() => void submit()}>
                    Coba lagi
                  </button>
                </>
              )}
              {receipt && (
                <>
                  <strong>Pembayaran berhasil</strong>
                  <dl className="cngpay-receipt">
                    <dt>Nominal</dt>
                    <dd>{rupiah(receipt.total)}</dd>
                    <dt>Metode</dt>
                    <dd>{METHOD_LABEL[method]}</dd>
                    <dt>Waktu</dt>
                    <dd>{receipt.at.toLocaleString("id-ID")}</dd>
                    <dt>Ref</dt>
                    <dd>{receipt.ref}</dd>
                  </dl>
                  <button type="button" className="warung-cta" onClick={close}>
                    Selesai
                  </button>
                </>
              )}
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
