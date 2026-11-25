import { rupiah, type WarungDebtHistory as Debt } from "@/game/warung/model";

const time = (iso: string) =>
  new Date(iso).toLocaleString("id-ID", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

/** One debt as a chat: the ask, your reminders, and how it ended (from the server log). */
function thread(d: Debt): { from: "npc" | "me" | "sys"; text: string; at: string }[] {
  if (d.kind === "pinjam_uang")
    return (d.messages ?? []).map((m) => ({ from: m.from, text: m.text, at: m.at }));
  const lines: { from: "npc" | "me"; text: string; at: string }[] = [
    {
      from: "npc",
      text: `Boleh ngutang ${rupiah(d.amount)} dulu? Nanti saya lunasi, janji.`,
      at: d.askedAt,
    },
    { from: "me", text: "Boleh, dicatat ya.", at: d.askedAt },
  ];
  for (const l of d.log) {
    const at = l.at;
    if (l.k === "chat_soft") {
      lines.push({ from: "me", text: "Kalau sempat aja ya bayarnya…", at });
      lines.push({ from: "npc", text: "Siap, nanti ya kalau ada rezeki", at });
    } else if (l.k === "chat_harsh") {
      lines.push({ from: "me", text: "Bayar utangnya sekarang! Udah lewat!", at });
      lines.push({ from: "npc", text: "Duh galak amat… nanti deh, saya kumpulin dulu.", at });
    } else if (l.k === "chat_paid") {
      lines.push({ from: "me", text: "Permisi, mau ingetin catatan utangnya ya", at });
      lines.push({ from: "npc", text: "Oh iya! Maaf lupa, ini saya transfer sekarang.", at });
    } else if (l.k === "chat_delayed") {
      lines.push({ from: "me", text: "Permisi, mau ingetin catatan utangnya ya", at });
      lines.push({ from: "npc", text: "Aduh, belum gajian… minggu ini ya, beneran.", at });
    } else if (l.k === "street_paid") {
      lines.push({ from: "me", text: "Eh ketemu di jalan! Sekalian utangnya ya", at });
      lines.push({ from: "npc", text: "Waduh ketahuan! Nih lunas, plus buat makasih.", at });
    } else if (l.k === "auto_paid") {
      lines.push({
        from: "npc",
        text: "Mampir mau lunasin utang, ada lebihnya buat makasih ya",
        at,
      });
    } else if (l.k === "auto_defaulted") {
      lines.push({
        from: "npc",
        text: "Maaf banget… saya belum bisa bayar. Pindah kontrakan dulu.",
        at,
      });
    }
  }
  // Older debts (before the log existed) still get an ending from their status.
  if (!d.log.length && d.status !== "ACCEPTED" && d.resolvedAt)
    lines.push({
      from: "npc",
      text:
        d.status === "PAID" ? "Utangnya saya lunasi ya, makasih!" : "Maaf, saya belum bisa bayar…",
      at: d.resolvedAt,
    });
  return lines;
}

const STATUS = { ACCEPTED: "Belum lunas", PAID: "Lunas", DEFAULTED: "Tidak dibayar" } as const;

export function WarungDebtThread({ debt }: { debt: Debt }) {
  return (
    <ol className="warung-chat-thread">
      {thread(debt).map((l, i) => (
        <li key={i} data-from={l.from === "me" ? "me" : "koko"}>
          {l.text}
          <small>{time(l.at)}</small>
        </li>
      ))}
    </ol>
  );
}

export function WarungDebtHistory({ debts }: { debts: Debt[] }) {
  if (!debts.length) return null;
  return (
    <section className="warung-journal" aria-label="Riwayat chat utang">
      <div className="warung-journal-head">
        <h4>Riwayat chat utang</h4>
      </div>
      {debts.map((d) => (
        <details key={d.id} className="warung-debt-history">
          <summary>
            <strong>{d.npc}</strong> · {rupiah(d.amount)}
            <span
              className="warung-demand"
              data-tone={d.status === "PAID" ? "good" : d.status === "DEFAULTED" ? "bad" : "ok"}
            >
              {STATUS[d.status]}
            </span>
          </summary>
          <WarungDebtThread debt={d} />
        </details>
      ))}
    </section>
  );
}
