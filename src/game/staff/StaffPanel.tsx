import { useEffect } from "react";
import { BookOpen, ChevronDown, CircleAlert, LockKeyhole } from "lucide-react";
import { rupiah } from "@/game/warung/model";
import { useWarung } from "@/game/warung/store";
import { useUsaha } from "@/game/usaha/store";
import { HudMenuArtwork } from "@/ui/hud/HudMenuArtwork";
import { KasMoneyIcon } from "@/ui/game-ui/KasMoneyIcon";
import { useHud } from "@/state/hud-store";
import { retryStaff, staffCommand, useStaff } from "./store";
import type { StaffBusiness, StaffData, StaffMember } from "./types";
import "./staff.css";

const ROLE_ART = {
  guard: "warung-shop",
  courier: "delivery",
  cook: "warung-work",
  keeper: "spawn",
} as const;
const ROLE_BENEFIT = {
  guard: "Melayani pembeli saat kamu pergi",
  courier: "Kulakan saat stok menipis",
  cook: "Bantu masak dari bahan tersedia",
  keeper: "Tangani keluhan penghuni kos",
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
  const due = member.amountDue > 0;
  const late = active && due;
  const locked = !active && !member.eligible;
  const short = !active && !locked && cash < member.hireCost;
  const status = late
    ? text.late_status.replace(":days", String(member.lateDays))
    : text[member.status];
  const action = active ? text.dismiss : member.status === "vacant" ? text.hire : text.rehire;
  const leaveNotice =
    late && member.leaveIn != null
      ? `${member.leaveIn} hari lagi pamit jika belum dibayar`
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
      <p className="staff-effect">{ROLE_BENEFIT[member.kind]}</p>
      <dl className="staff-pay">
        <div>
          <dt>Gaji harian</dt>
          <dd>
            <KasMoneyIcon />
            {rupiah(member.daily)}
          </dd>
        </div>
        <div>
          <dt>Belum dibayar</dt>
          <dd data-due={due}>{rupiah(member.amountDue ?? 0)}</dd>
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
          <div className="staff-pay-warning">
            <div className="staff-grace" aria-hidden>
              {[0, 1, 2].map((day) => (
                <i key={day} data-unpaid={day < member.lateDays} />
              ))}
            </div>
            <p className="staff-warning">
              <CircleAlert size={15} aria-hidden />
              <span>{leaveNotice}</span>
            </p>
          </div>
        )}
        {active && !due && <p className="staff-paid">✓ Gaji sudah beres</p>}
        {!active && due && (
          <p className="staff-warning">Lunasi gaji tertunda lewat CngBank sebelum rekrut lagi.</p>
        )}
        {member.status === "left" && (
          <p>
            Karyawan sudah pamit karena gaji belum dibayar 3 hari. Bisa direkrut lagi tanpa denda.
          </p>
        )}
      </div>
      {member.kind === "courier" && active && member.restockTargetPercent != null && (
        <fieldset className="staff-target" disabled={pending}>
          <legend>Target isi rak</legend>
          <div>
            {[25, 50, 75, 100].map((percent) => (
              <button
                key={percent}
                type="button"
                aria-pressed={member.restockTargetPercent === percent}
                onClick={() => {
                  if (member.restockTargetPercent !== percent)
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
            Stok di bawah 25% diisi sampai target ini. Pesanan yang sudah dikirim tetap datang.
          </small>
        </fieldset>
      )}
      <footer className="staff-card-action">
        {!active && <p>{text.hire_cost.replace(":amount", rupiah(member.hireCost))}</p>}
        {due && (
          <button
            type="button"
            className="warung-cta"
            disabled={pending}
            onClick={() => useHud.getState().openStaffPayment(member.kind)}
          >
            Bayar gaji
          </button>
        )}
        <button
          type="button"
          className={active ? "warung-secondary" : "warung-cta"}
          disabled={pending || locked || short || (!active && due)}
          onClick={() => void staffCommand(active ? "dismiss" : "hire", { kind: member.kind })}
        >
          {action}
        </button>
      </footer>
      <details className="staff-handbook">
        <summary>
          Tugas & gaji bulanan
          <ChevronDown size={16} aria-hidden />
        </summary>
        <p>{member.effect}</p>
        <p>
          {rupiah(member.monthly)}/bulan · {text.rounding}
        </p>
      </details>
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
        <span className="staff-manual">Gaji manual</span>
        {members.length > 0 && (
          <span>
            {activeCount} dari {members.length} posisi terisi
          </span>
        )}
      </header>
      <p className="staff-intro">
        Cek pesan karyawan, lalu transfer gajinya lewat CngBank. Kas tidak dipotong otomatis.
      </p>
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
