import { useEffect, useState } from "react";
import { worldRequest } from "@/services/world/client";
import { useWarung } from "@/game/warung/store";
import { rupiah } from "@/game/warung/model";
import { JOURNAL_LABEL } from "./WarungPanel";
import "./warung-report.css";

interface Totals {
  sales: number;
  costs: number;
  salary: number;
  guardSales: number;
  profit: number;
  profitWithoutStaff: number;
  byType: Record<string, number>;
}
interface Report {
  today: Totals;
  yesterday: Totals;
  month: Totals;
  days: { date: string; sales: number; costs: number }[];
  labels: Record<"title" | "note" | "staff_note" | "staff_gain" | "staff_loss", string>;
}

const signed = (n: number) => `${n < 0 ? "−" : ""}${rupiah(Math.abs(n))}`;
const dayLabel = (iso: string) =>
  new Date(`${iso}T12:00:00+07:00`).toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    timeZone: "Asia/Jakarta",
  });

/** Laba/rugi warung from the cash journal: today, yesterday, this month and a 30-day omzet chart (WIB dates). */
export function WarungReportCard() {
  const newest = useWarung((s) => s.data?.journal[0]?.id);
  const [report, setReport] = useState<Report | null>(null);
  const [failed, setFailed] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    worldRequest<{ report: Report }>("warung", { action: "report" })
      .then((r) => live && (setReport(r.report), setFailed(false)))
      .catch(() => live && setFailed(true));
    return () => {
      live = false;
    };
  }, [newest]);
  if (!report)
    return (
      <p className="warung-hint">{failed ? "Laporan belum bisa dimuat." : "Memuat laporan…"}</p>
    );
  const t = report.labels;
  const peak = Math.max(1, ...report.days.map((d) => Math.max(d.sales, d.costs)));
  const day = picked !== null ? report.days[picked] : null;
  const staffDelta = report.month.profit - report.month.profitWithoutStaff;
  const hasStaff = report.month.salary > 0 || report.month.guardSales > 0;
  return (
    <section className="warung-report" aria-label={t.title}>
      <div className="warung-report-stats">
        {(
          [
            ["Kemarin", report.yesterday],
            ["Hari ini", report.today],
            ["Bulan ini", report.month],
          ] as const
        ).map(([label, x]) => (
          <div key={label}>
            <small>{label}</small>
            <strong>{rupiah(x.sales)}</strong>
            <span data-negative={x.profit < 0 || undefined}>Laba {signed(x.profit)}</span>
          </div>
        ))}
      </div>

      <div className="warung-report-chart" role="img" aria-label="Omzet 30 hari terakhir">
        {report.days.map((d, i) => (
          <button
            key={d.date}
            type="button"
            aria-pressed={picked === i}
            aria-label={`${dayLabel(d.date)}: omzet ${rupiah(d.sales)}, biaya ${rupiah(d.costs)}`}
            onClick={() => setPicked(picked === i ? null : i)}
          >
            <i style={{ height: `${(d.sales / peak) * 100}%` }} />
            <i data-cost style={{ height: `${(d.costs / peak) * 100}%` }} />
          </button>
        ))}
      </div>
      <p className="warung-report-legend">
        <span data-key="sales">Omzet</span> <span data-key="costs">Biaya</span>
        {day
          ? ` · ${dayLabel(day.date)}: omzet ${rupiah(day.sales)}, biaya ${rupiah(day.costs)}, laba ${signed(day.sales - day.costs)}`
          : " · ketuk batang untuk rincian hari itu"}
      </p>

      <h4>Bulan ini</h4>
      <ul className="warung-report-lines">
        <li>
          <span>Omzet penjualan</span>
          <b>{rupiah(report.month.sales)}</b>
        </li>
        {Object.entries(report.month.byType)
          .sort((a, b) => b[1] - a[1])
          .map(([type, v]) => (
            <li key={type}>
              <span>{type === "THEFT" ? "Riwayat kemalingan" : (JOURNAL_LABEL[type] ?? type)}</span>
              <b data-negative>−{rupiah(v)}</b>
            </li>
          ))}
        <li data-total>
          <span>Laba/rugi</span>
          <b data-negative={report.month.profit < 0 || undefined}>{signed(report.month.profit)}</b>
        </li>
        {hasStaff && (
          <li>
            <span>Tanpa karyawan (perkiraan)</span>
            <b>{signed(report.month.profitWithoutStaff)}</b>
          </li>
        )}
      </ul>
      {(report.month.byType["THEFT"] ?? 0) > 0 && (
        <p className="warung-hint">
          Kemalingan adalah total kerugian bulan ini. Merekrut penjaga tidak menghapus catatan
          sebelumnya; penjaga yang masih bekerja mencegah pencurian baru.
        </p>
      )}
      {hasStaff && (
        <p className="warung-hint">
          {(staffDelta >= 0 ? t.staff_gain : t.staff_loss).replace(
            ":amount",
            rupiah(Math.abs(staffDelta)),
          )}{" "}
          {t.staff_note}
        </p>
      )}
      <p className="warung-hint">{t.note}</p>
    </section>
  );
}
