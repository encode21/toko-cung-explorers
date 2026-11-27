import { useEffect } from "react";
import { Bike, ChefHat, House, ShieldCheck, Users, Wallet } from "lucide-react";
import { rupiah } from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { useHud } from "@/state/hud-store";
import { retryStaff, staffCommand, useStaff } from "./store";
import type { StaffBusiness } from "./types";
import "./staff.css";

const roles = {
  guard: {
    icon: ShieldCheck,
    benefit: "Melayani pembeli saat kamu pergi",
    detail: "Jaga warung · Bantu antrean",
  },
  courier: {
    icon: Bike,
    benefit: "Kulakan saat stok menipis",
    detail: "Pantau stok · Pesan kiriman",
  },
  cook: {
    icon: ChefHat,
    benefit: "Bantu masak dari bahan tersedia",
    detail: "Siapkan menu · Jaga porsi",
  },
  keeper: {
    icon: House,
    benefit: "Tangani keluhan penghuni kos",
    detail: "Rawat kos · Bantu penghuni",
  },
};

export function StaffPanel({ business }: { business: StaffBusiness }) {
  const { data, busy, error, retry } = useStaff();
  const level = useWarung((s) => s.data?.warung?.level);
  const owns = useUsaha((s) => business === "warung" || !!s.data?.[business]);
  useEffect(() => {
    void staffCommand("state");
  }, [business, level, owns]);
  if (!data) return null;
  const t = data.text;
  return (
    <section className="staff-panel" aria-label={t.title}>
      <div className="staff-section-heading">
        <h4>
          <Users size={20} aria-hidden /> {t.title}
        </h4>
        <span>Gaji manual</span>
      </div>
      <p className="staff-intro">Cek pesan karyawan, lalu transfer gajinya lewat CngBank.</p>
      {error && (
        <p className="warung-error" role="alert">
          {error}
        </p>
      )}
      {retry && (
        <button
          type="button"
          className="warung-cta"
          disabled={busy}
          onClick={() => void retryStaff()}
        >
          {t.retry}
        </button>
      )}
      <div className="staff-grid">
        {data.staff
          .filter((e) => e.business === business)
          .map((e) => {
            const role = roles[e.kind];
            const Icon = role.icon;
            const due = e.amountDue > 0;
            const active = e.status === "active";
            return (
              <article className="staff-card" key={e.kind} data-kind={e.kind}>
                <div className="staff-card-heading">
                  <span className="staff-avatar">
                    <Icon size={30} aria-hidden />
                  </span>
                  <div>
                    <h5>{e.name}</h5>
                    <span className="staff-status" data-late={due}>
                      {due ? t.late_status.replace(":days", String(e.lateDays)) : t[e.status]}
                    </span>
                  </div>
                </div>
                <div className="staff-benefit">
                  <strong>{role.benefit}</strong>
                  <small>{role.detail}</small>
                </div>
                <dl className="staff-stats">
                  <div>
                    <dt>Gaji / hari</dt>
                    <dd>{rupiah(e.daily)}</dd>
                  </div>
                  <div>
                    <dt>Belum dibayar</dt>
                    <dd data-due={due}>{rupiah(e.amountDue ?? 0)}</dd>
                  </div>
                </dl>
                {active && due && (
                  <div className="staff-pay-warning">
                    <div className="staff-grace" aria-hidden>
                      {[0, 1, 2].map((i) => (
                        <i key={i} data-unpaid={i < e.lateDays} />
                      ))}
                    </div>
                    <span>{e.leaveIn} hari lagi pamit jika belum dibayar</span>
                  </div>
                )}
                {active && !due && <p className="staff-paid">✓ Gaji sudah beres</p>}
                {!active && (
                  <p className="staff-reason">
                    {!e.eligible
                      ? e.requirement
                      : due
                        ? t["pay_previous"]
                        : "Rekrut dulu, bayar gaji lewat CngBank."}
                  </p>
                )}
                {e.kind === "courier" && active && e.restockTargetPercent != null && (
                  <fieldset className="staff-target" disabled={busy || !!retry}>
                    <legend>Target isi rak</legend>
                    <div>
                      {[25, 50, 75, 100].map((percent) => (
                        <button
                          key={percent}
                          type="button"
                          aria-pressed={e.restockTargetPercent === percent}
                          onClick={() => {
                            if (e.restockTargetPercent !== percent)
                              void staffCommand("configure", {
                                kind: "courier",
                                restockTargetPercent: percent,
                              });
                          }}
                        >
                          {percent}%
                        </button>
                      ))}
                    </div>
                    <small>
                      Stok di bawah 25% diisi sampai target ini. Pesanan yang sudah dikirim tetap
                      datang.
                    </small>
                  </fieldset>
                )}
                <div className="staff-actions">
                  {due && (
                    <button
                      type="button"
                      className="warung-cta"
                      onClick={() => useHud.getState().openStaffPayment(e.kind)}
                    >
                      <Wallet size={16} aria-hidden /> Bayar gaji
                    </button>
                  )}
                  <button
                    type="button"
                    className={active ? "warung-secondary" : "warung-cta"}
                    disabled={busy || !!retry || (!active && (!e.eligible || due))}
                    onClick={() => void staffCommand(active ? "dismiss" : "hire", { kind: e.kind })}
                  >
                    {active ? t.dismiss : e.status === "vacant" ? t.hire : t.rehire}
                  </button>
                </div>
                <details className="staff-details">
                  <summary>Tugas & gaji bulanan</summary>
                  <p>{e.effect}</p>
                  <p>
                    {rupiah(e.monthly)}/bulan · {t.rounding}
                  </p>
                </details>
              </article>
            );
          })}
      </div>
      <details className="staff-details staff-rules">
        <summary>Aturan gaji & karyawan pamit</summary>
        <ul>
          {t.rules.split("\n").map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </details>
    </section>
  );
}
