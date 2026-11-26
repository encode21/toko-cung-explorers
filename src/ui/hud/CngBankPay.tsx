import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CircleCheck,
  Copy,
  Delete,
  Hash,
  Landmark,
  QrCode,
  Store,
} from "lucide-react";
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
import "./cngbank-pay.css";

const KEY = "cngbank-pay-method";
const REKENING = "1234 5678 90";
const VA = "8808 1234 5678 9012";
const METHOD_LABEL: Record<PayMethod, string> = {
  qris: "QRIS",
  transfer: "Transfer",
  va: "Virtual Account",
};
const METHOD_ICON = { qris: QrCode, transfer: Landmark, va: Hash } as const;
const MODE_LABEL = { ambil: "Bawa sendiri", antar: "Diantar" } as const;

function lastMethod(): PayMethod | null {
  try {
    const v = localStorage.getItem(KEY);
    if (isPayMethod(v)) return v;
  } catch {
    /* Payment remains available when browser storage is blocked. */
  }
  return null;
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
  const [previousMethod] = useState(lastMethod);
  const [method, setMethod] = useState<PayMethod>(previousMethod ?? "qris");
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
    setPin("");
    setCopied(false);
    setScanned(false);
    setLeft(900);
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
      setError(useWarung.getState().error || "Pembayaran belum berhasil. Coba lagi.");
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
  const accountNumber = method === "va" ? VA : REKENING;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(accountNumber.replace(/ /g, ""));
      setCopied(true);
    } catch {
      /* The full account number remains readable and selectable. */
    }
  };

  return (
    <div key={step} className="cngpay" data-cngbank-pay={step}>
      {step !== "receipt" && (
        <div className="cngpay-summary">
          <span className="cngpay-merchant">
            <Store size={16} aria-hidden /> Kasir Toko Cung
          </span>
          <div className="cngpay-total">
            <span>Total bayar</span>
            <strong>{rupiah(total)}</strong>
          </div>
        </div>
      )}

      {step === "method" && (
        <>
          <section className="cngpay-section" aria-labelledby="cngpay-pickup">
            <h3 id="cngpay-pickup">Pengambilan barang</h3>
            <div className="cngpay-modes" role="group" aria-labelledby="cngpay-pickup">
              {(["ambil", "antar"] as const).map((m) => (
                <button key={m} type="button" aria-pressed={mode === m} onClick={() => setMode(m)}>
                  {MODE_LABEL[m]}
                  <small>{m === "antar" ? `+${rupiah(deliveryFee(goods))}` : "Gratis"}</small>
                </button>
              ))}
            </div>
          </section>
          <section className="cngpay-section" aria-labelledby="cngpay-method">
            <h3 id="cngpay-method">Pilih cara bayar</h3>
            {PAY_METHODS.map((m) => {
              const Icon = METHOD_ICON[m];
              return (
                <button
                  key={m}
                  type="button"
                  className="cngpay-method"
                  disabled={!goods}
                  onClick={() => pick(m)}
                >
                  <Icon size={18} aria-hidden />
                  <span>{METHOD_LABEL[m]}</span>
                  {m === previousMethod && <small>Terakhir dipakai</small>}
                  <ChevronRight size={15} aria-hidden />
                </button>
              );
            })}
          </section>
        </>
      )}

      {(step === "qris" || step === "transfer" || step === "va" || step === "pin") && (
        <button type="button" className="cngpay-change" onClick={() => setStep("method")}>
          <ArrowLeft size={14} aria-hidden /> Ganti cara bayar
        </button>
      )}

      {step === "qris" && (
        <section className="cngpay-section cngpay-center">
          <h3 aria-live="polite">{scanned ? "QRIS terbaca" : "Memindai QRIS…"}</h3>
          <div className="cngpay-scan" data-done={scanned || undefined}>
            <Qr />
            {!scanned && <i className="cngpay-line" />}
          </div>
          {!scanned && (
            <button type="button" className="cngpay-action" onClick={() => setScanned(true)}>
              Lewati pemindaian
            </button>
          )}
        </section>
      )}

      {(step === "transfer" || step === "va") && (
        <section className="cngpay-section">
          <h3>{step === "va" ? "Virtual Account Toko Cung" : "Rekening Toko Cung"}</h3>
          <div className="cngpay-account">
            <strong>{accountNumber}</strong>
            <button
              type="button"
              aria-label={copied ? "Nomor tersalin" : "Salin nomor"}
              onClick={() => void copy()}
            >
              {copied ? <Check size={17} aria-hidden /> : <Copy size={17} aria-hidden />}
            </button>
          </div>
          {step === "va" && (
            <p className="cngpay-meta">
              Waktu pembayaran {String(Math.floor(left / 60)).padStart(2, "0")}:
              {String(left % 60).padStart(2, "0")}
            </p>
          )}
          <button type="button" className="cngpay-primary" onClick={go}>
            Lanjut ke PIN
          </button>
        </section>
      )}

      {step === "pin" && (
        <section className="cngpay-section cngpay-center">
          <h3>Masukkan PIN simulasi</h3>
          <div
            className="cngpay-dots"
            role="status"
            aria-label={`${pin.length} dari ${PIN_LENGTH} digit`}
          >
            {Array.from({ length: PIN_LENGTH }, (_, i) => (
              <i key={i} data-on={i < pin.length || undefined} />
            ))}
          </div>
          <div className="cngpay-pad">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", "", "0", "hapus"].map((d, i) =>
              d ? (
                <button
                  key={i}
                  type="button"
                  aria-label={d === "hapus" ? "Hapus satu angka" : d}
                  onClick={() => (d === "hapus" ? setPin(pin.slice(0, -1)) : tapPin(d))}
                >
                  {d === "hapus" ? <Delete size={18} aria-hidden /> : d}
                </button>
              ) : (
                <span key={i} />
              ),
            )}
          </div>
          <button
            type="button"
            className="cngpay-action"
            disabled={busy || paying}
            onClick={() => void submit()}
          >
            Bayar tanpa PIN
          </button>
        </section>
      )}

      {step === "receipt" && (
        <section className="cngpay-section cngpay-receipt-view">
          {paying && <h3 role="status">Pembayaran diproses…</h3>}
          {error && (
            <>
              <h3>Pembayaran gagal</h3>
              <p className="cngpay-meta" role="alert">
                {error}
              </p>
              <button
                type="button"
                className="cngpay-primary"
                disabled={busy}
                onClick={() => void submit()}
              >
                Coba lagi
              </button>
            </>
          )}
          {receipt && (
            <>
              <CircleCheck className="cngpay-success" size={32} aria-hidden />
              <h3 role="status">Pembayaran berhasil</h3>
              <strong className="cngpay-paid">{rupiah(receipt.total)}</strong>
              <dl className="cngpay-receipt">
                <dt>Penerima</dt>
                <dd>Kasir Toko Cung</dd>
                <dt>Metode</dt>
                <dd>{METHOD_LABEL[method]}</dd>
                <dt>Pengambilan</dt>
                <dd>{MODE_LABEL[mode]}</dd>
                <dt>Waktu</dt>
                <dd>{receipt.at.toLocaleString("id-ID")}</dd>
                <dt>Referensi</dt>
                <dd>{receipt.ref}</dd>
              </dl>
              <button type="button" className="cngpay-primary" onClick={close}>
                Selesai
              </button>
            </>
          )}
        </section>
      )}
    </div>
  );
}
