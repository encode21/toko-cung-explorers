import { useEffect } from "react";
import { BookOpen, ChevronDown, CircleAlert, LockKeyhole } from "lucide-react";
import { rupiah } from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { HudMenuArtwork } from "@/ui/hud/HudMenuArtwork";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { retryStaff, staffCommand, useStaff } from "./store";
import type { StaffBusiness, StaffData, StaffMember } from "./types";
import "./staff.css";

const ROLE_ART = {
  guard: "warung-shop",
  courier: "delivery",
  cook: "warung-work",
  keeper: "spawn",
} as const;

function StaffCard({
  member,
  text,
  cash,
  pending,
}: {
  member: StaffMember;
  text: StaffData["text"];
  cash: number;
  pending: boolean;
}) {
  const active = member.status === "active";
  const late = active && member.lateDays > 0;
  const locked = !active && !member.eligible;
  const short = !active && !locked && cash < member.hireCost;
  const status = late
    ? text.late_status.replace(":days", String(member.lateDays))
    : text[member.status];
  const action = active ? text.dismiss : member.status === "vacant" ? text.hire : text.rehire;
  const leaveNotice =
    late && member.leaveIn != null
      ? text["leave_in"]
          ?.replace(":days", String(member.lateDays))
          .replace(":left", String(member.leaveIn))
      : undefined;

  return (
    <article className="staff-card" aria-label={member.name}>
      <header className="staff-card-heading">
        <span className="staff-role-art">
          <HudMenuArtwork kind={ROLE_ART[member.kind]} />
        </span>
        <div>
          <h5>{member.name}</h5>
          <span className="staff-status" data-tone={late ? "late" : active ? "active" : "idle"}>
            {status}
          </span>
        </div>
      </header>
      <p className="staff-effect">{member.effect}</p>
      <dl className="staff-pay">
        <div>
          <dt>Gaji harian</dt>
          <dd>
            <KasMoneyIcon />
            {rupiah(member.daily)}
          </dd>
        </div>
        <div>
          <dt>Gaji bulanan</dt>
          <dd>{rupiah(member.monthly)}</dd>
        </div>
      </dl>
      <div className="staff-card-notes">
        {!active && member.requirement && (
          <p className="staff-requirement">
            {locked && <LockKeyhole size={14} aria-hidden />}
            <span>
              <strong>{locked ? text.locked : "Syarat rekrut"}</strong> {member.requirement}
            </span>
          </p>
        )}
        {short && (
          <p className="staff-warning">
            <CircleAlert size={15} aria-hidden />
            <span>{text.cash_low}</span>
          </p>
        )}
        {leaveNotice && (
          <p className="staff-warning">
            <CircleAlert size={15} aria-hidden />
            <span>{leaveNotice}</span>
          </p>
        )}
        {active && !late && text["paid_until"] && <p>{text["paid_until"]}</p>}
        {active && text["offline_tip"] && (
          <p>{text["offline_tip"].replace(":amount", rupiah(member.daily * 3))}</p>
        )}
      </div>
      <footer className="staff-card-action">
        {!active && <p>{text.hire_cost.replace(":amount", rupiah(member.hireCost))}</p>}
        <button
          type="button"
          className={active ? "warung-secondary" : "warung-cta"}
          disabled={pending || locked || short}
          onClick={() => void staffCommand(active ? "dismiss" : "hire", { kind: member.kind })}
        >
          {action}
        </button>
      </footer>
    </article>
  );
}

export function StaffPanel({ business }: { business: StaffBusiness }) {
  const { data, busy, error, retry } = useStaff();
  const level = useWarung((s) => s.data?.warung?.level);
  const owns = useUsaha((s) => business === "warung" || !!s.data?.[business]);
  useEffect(() => {
    void staffCommand("state");
  }, [business, level, owns]);

  if (!data && !error && !retry) return null;
  const members = data?.staff.filter((member) => member.business === business) ?? [];
  const activeCount = members.filter((member) => member.status === "active").length;
  const title = data?.text.title ?? "Karyawan";
  return (
    <section className="staff-panel" aria-label={title}>
      <header className="staff-panel-heading">
        <h4>{title}</h4>
        {members.length > 0 && (
          <span>
            {activeCount} dari {members.length} posisi terisi
          </span>
        )}
      </header>
      {error && (
        <p className="warung-error" role="alert">
          {error}
        </p>
      )}
      {retry && (
        <button
          type="button"
          className="warung-secondary staff-retry"
          disabled={busy}
          onClick={retryStaff}
        >
          {data?.text.retry ?? "Coba lagi"}
        </button>
      )}
      {data && (
        <>
          {members.length ? (
            <div className="staff-roster">
              {members.map((member) => (
                <StaffCard
                  key={member.kind}
                  member={member}
                  text={data.text}
                  cash={data.kas ?? 0}
                  pending={busy || !!retry}
                />
              ))}
            </div>
          ) : (
            <p className="staff-empty">Belum ada posisi karyawan untuk usaha ini.</p>
          )}
          {(data.text.rules || data.text.rounding) && (
            <details className="staff-handbook">
              <summary>
                <BookOpen size={16} aria-hidden />
                Aturan gaji
                <ChevronDown size={16} aria-hidden />
              </summary>
              {data.text.rules && (
                <ul>
                  {data.text.rules
                    .replace(/\.\s+(?=[A-Z])/g, ".\n")
                    .split(/\n+/)
                    .filter(Boolean)
                    .map((rule, index) => (
                      <li key={index}>{rule}</li>
                    ))}
                </ul>
              )}
              {data.text.rounding && <p>{data.text.rounding}</p>}
            </details>
          )}
        </>
      )}
    </section>
  );
}
