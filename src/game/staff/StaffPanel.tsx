import { useEffect } from "react";
import { Users } from "lucide-react";
import { rupiah } from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { retryStaff, staffCommand, useStaff } from "./store";
import type { StaffBusiness } from "./types";
import "./staff.css";

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
      <h4>
        <Users size={20} aria-hidden /> {t.title}
      </h4>
      <p className="warung-hint">{t.rules}</p>
      <p className="warung-hint">{t.rounding}</p>
      {error && (
        <p className="warung-error" role="alert">
          {error}
        </p>
      )}
      {retry && (
        <button type="button" className="warung-cta" disabled={busy} onClick={retryStaff}>
          {t.retry}
        </button>
      )}
      {data.staff
        .filter((e) => e.business === business)
        .map((e) => (
          <article className="staff-card" key={e.kind}>
            <div className="staff-card-heading">
              <strong>{e.name}</strong>
              <span className="staff-status" data-late={e.status === "active" && e.lateDays > 0}>
                {e.status === "active" && e.lateDays > 0
                  ? t.late_status.replace(":days", String(e.lateDays))
                  : t[e.status]}
              </span>
            </div>
            <p>
              {t.salary.replace(":daily", rupiah(e.daily)).replace(":monthly", rupiah(e.monthly))}
            </p>
            <p>{e.effect}</p>
            {e.status !== "active" && (
              <p>
                {e.requirement} · {t.hire_cost.replace(":amount", rupiah(e.hireCost))}
              </p>
            )}
            {!e.eligible && (
              <p className="staff-reason">
                {t.locked} {e.requirement}
              </p>
            )}
            {e.eligible && e.status !== "active" && (data.kas ?? 0) < e.hireCost && (
              <p className="staff-reason">{t.cash_low}</p>
            )}
            <button
              type="button"
              className={e.status === "active" ? "warung-secondary" : "warung-cta"}
              disabled={
                busy ||
                !!retry ||
                (e.status !== "active" && (!e.eligible || (data.kas ?? 0) < e.hireCost))
              }
              onClick={() =>
                void staffCommand(e.status === "active" ? "dismiss" : "hire", { kind: e.kind })
              }
            >
              {e.status === "active" ? t.dismiss : e.status === "vacant" ? t.hire : t.rehire}
            </button>
          </article>
        ))}
    </section>
  );
}
