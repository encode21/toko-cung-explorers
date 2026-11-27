import { useEffect, useRef, useState } from "react";
import { CheckCircle2, ChevronRight, Users } from "lucide-react";
import { retryStaff, staffCommand, useStaff } from "@/game/staff/store";
import type { StaffKind, StaffMember } from "@/game/staff/types";
import { rupiah } from "@/game/warung/model";

export function StaffPayments({ initialKind }: { initialKind: StaffKind | null }) {
  const { data, busy, error, retry } = useStaff();
  const [quote, setQuote] = useState<StaffMember | null>(null);
  const [feedback, setFeedback] = useState("");
  const opened = useRef(false);
  useEffect(() => {
    void staffCommand("state");
  }, []);
  useEffect(() => {
    if (!opened.current && data) {
      opened.current = true;
      setQuote(data.staff.find((e) => e.kind === initialKind && e.amountDue > 0) ?? null);
    }
  }, [data, initialKind]);

  async function transfer(retrying = false) {
    if (!retrying && !quote?.paymentToken) return;
    const payingSalary = !retrying || retry?.action === "pay";
    setFeedback("");
    const result = retrying
      ? await retryStaff()
      : await staffCommand("pay", { kind: quote!.kind, paymentToken: quote!.paymentToken! });
    if (result?.enabled) {
      setQuote(null);
      setFeedback(
        payingSalary
          ? "Transfer berhasil. Bukti tercatat di Mutasi dan karyawan sudah membalas di CngChat."
          : "Permintaan sebelumnya selesai. Pilih gaji yang ingin dibayar.",
      );
    } else if (!useStaff.getState().retry) {
      setFeedback(
        useStaff.getState().error || "Transfer belum berhasil. Periksa tagihan lalu coba lagi.",
      );
      setQuote(null);
      void staffCommand("state");
    }
  }

  if (!data)
    return (
      <>
        <p className="bank-empty" role="status">
          {error || (busy ? "Memuat gaji karyawan…" : "Gaji karyawan belum tersedia.")}
        </p>
        {error && (
          <button
            type="button"
            className="bank-primary"
            disabled={busy}
            onClick={() => void (retry ? retryStaff() : staffCommand("state"))}
          >
            Muat ulang
          </button>
        )}
      </>
    );
  const employees = data.staff.filter((e) => e.status === "active" || e.amountDue > 0);
  const due = employees.reduce((total, e) => total + (e.amountDue ?? 0), 0);
  return (
    <section className="bank-salary" aria-label="Gaji karyawan">
      <div className="bank-figure">
        <span>Total gaji belum dibayar</span>
        <strong>{rupiah(due)}</strong>
      </div>
      <p className="bank-help">Gaji dibayar dari Kas usaha setelah kamu konfirmasi transfer.</p>
      {quote ? (
        <section className="bank-bill" aria-label="Konfirmasi transfer gaji">
          <h3>Periksa transfer</h3>
          <dl className="bank-lines">
            <div>
              <dt>Penerima</dt>
              <dd>{quote.name}</dd>
            </div>
            <div>
              <dt>Sumber dana</dt>
              <dd>Kas usaha · {rupiah(data.kas ?? 0)}</dd>
            </div>
            <div>
              <dt>Gaji belum dibayar</dt>
              <dd>{quote.lateDays} hari</dd>
            </div>
            <div>
              <dt>Sampai tanggal</dt>
              <dd>{quote.dueThrough} WIB</dd>
            </div>
            <div>
              <dt>Total transfer</dt>
              <dd>{rupiah(quote.amountDue)}</dd>
            </div>
          </dl>
          {(data.kas ?? 0) < quote.amountDue && (
            <p className="bank-help">Kas belum cukup. Isi kas sebelum transfer gaji.</p>
          )}
          <button
            type="button"
            className="bank-primary"
            disabled={busy || !!retry || (data.kas ?? 0) < quote.amountDue}
            onClick={() => void transfer()}
          >
            Konfirmasi transfer {rupiah(quote.amountDue)}
          </button>
          <button
            type="button"
            className="bank-salary-cancel"
            disabled={busy || !!retry}
            onClick={() => setQuote(null)}
          >
            Kembali ke daftar gaji
          </button>
        </section>
      ) : employees.length ? (
        <ul className="bank-salary-list">
          {employees.map((e) => (
            <li key={e.kind}>
              <button
                type="button"
                disabled={busy || !!retry || !(e.amountDue > 0)}
                onClick={() => {
                  setFeedback("");
                  setQuote(e);
                }}
              >
                <span className="bank-salary-avatar">
                  <Users size={22} aria-hidden />
                </span>
                <span>
                  <strong>{e.name}</strong>
                  <small>
                    {e.amountDue > 0 ? `${e.lateDays} hari belum dibayar` : "Gaji sudah beres"}
                  </small>
                </span>
                <b>
                  {e.amountDue > 0 ? (
                    rupiah(e.amountDue)
                  ) : (
                    <CheckCircle2 size={20} aria-label="Lunas" />
                  )}
                </b>
                {e.amountDue > 0 && <ChevronRight size={16} aria-hidden />}
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="bank-empty">Belum ada karyawan. Rekrut lewat Operasional usaha.</p>
      )}
      {(feedback || error) && (
        <p className="bank-help" role={error ? "alert" : "status"}>
          {feedback || error}
        </p>
      )}
      {retry && (
        <button
          type="button"
          className="bank-primary"
          disabled={busy}
          onClick={() => void transfer(true)}
        >
          {retry.action === "pay" ? "Cek ulang pembayaran" : "Cek ulang permintaan"}
        </button>
      )}
    </section>
  );
}
