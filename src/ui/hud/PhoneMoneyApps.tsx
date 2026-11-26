import { useEffect, useRef, useState } from "react";
import {
  ArrowDownLeft,
  ArrowLeftRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  Eye,
  EyeOff,
  NotebookTabs,
  ReceiptText,
  WalletCards,
} from "lucide-react";
import { KasbonCard } from "@/game/gang/GangEconomyCards";
import { isCashMovement } from "@/game/gang/economy";
import { rupiah, type WarungRent, type WarungSnapshot } from "@/game/warung/model";
import { useWarung, warungCommand } from "@/game/warung/store";
import { createId } from "@/lib/id";
import { useHud } from "@/state/hud-store";
import { PhoneAppScreen } from "./PhonePanel";
import { CngBankPay } from "./CngBankPay";
import { JournalFilterPills, JournalList, type JournalFilter } from "./WarungPanel";
import "./warung-panel.css";
import "./cngbank.css";

export { NotesApp } from "./NotesApp";

const destinations = [
  { id: "bills", label: "Tagihan", icon: ReceiptText },
  { id: "credit", label: "Kasbon", icon: WalletCards },
  { id: "journal", label: "Mutasi", icon: ArrowLeftRight },
] as const;
type BankView = "home" | (typeof destinations)[number]["id"];

function BankBill({ rent, cash }: { rent: WarungRent | null; cash: number }) {
  const busy = useWarung((s) => s.busy);
  const [feedback, setFeedback] = useState("");
  const request = useRef<string | null>(null);
  if (!rent) return <p className="bank-empty">Belum ada tagihan warung.</p>;
  const owes = rent.owedDays > 0 && rent.owed > 0;
  const payable =
    rent.daily > 0 ? Math.min(rent.owed, Math.floor(cash / rent.daily) * rent.daily) : 0;
  async function pay() {
    request.current ??= createId();
    setFeedback("");
    const result = await warungCommand("pay_rent", { requestId: request.current });
    if (result) {
      request.current = null;
      setFeedback("Pembayaran tercatat.");
    } else {
      setFeedback(useWarung.getState().error || "Pembayaran belum berhasil. Coba lagi.");
    }
  }
  return (
    <section className="bank-bill" aria-label="Rincian tagihan">
      {owes ? (
        <div className="bank-figure">
          <span>Total tagihan</span>
          <strong>{rupiah(rent.owed)}</strong>
        </div>
      ) : (
        <p className="bank-settled">
          <CheckCircle2 size={19} aria-hidden /> Semua tagihan lunas.
        </p>
      )}
      <dl className="bank-lines">
        <div>
          <dt>Penerima</dt>
          <dd>{rent.landlord}</dd>
        </div>
        <div>
          <dt>Tarif per hari</dt>
          <dd>{rupiah(rent.daily)}</dd>
        </div>
        {owes && (
          <div>
            <dt>Belum dibayar</dt>
            <dd>{rent.owedDays} hari</dd>
          </div>
        )}
      </dl>
      {owes && (
        <>
          {payable < rent.owed && (
            <p className="bank-help">
              {payable > 0
                ? `Saldo cukup untuk membayar ${Math.floor(payable / rent.daily)} dari ${rent.owedDays} hari.`
                : "Saldo kas belum cukup untuk membayar satu hari."}
            </p>
          )}
          <button
            type="button"
            className="bank-primary"
            disabled={busy || payable <= 0}
            onClick={() => void pay()}
          >
            {payable > 0 ? `Bayar ${rupiah(payable)}` : "Bayar tagihan"}
          </button>
        </>
      )}
      {feedback && (
        <p className="bank-help" role="status">
          {feedback}
        </p>
      )}
    </section>
  );
}

function BankHistory({ journal }: { journal: WarungSnapshot["journal"] }) {
  const [filter, setFilter] = useState<JournalFilter>("all");
  if (!journal.length) return <p className="bank-empty">Belum ada transaksi kas.</p>;
  let income = 0;
  let expenses = 0;
  for (const row of journal) {
    if (!isCashMovement(row)) continue;
    if (row.amount < 0) expenses -= row.amount;
    else income += row.amount;
  }
  return (
    <>
      <section className="bank-statement" aria-label="Ringkasan mutasi">
        <h4>Ringkasan {journal.length} catatan terakhir</h4>
        <dl>
          <div>
            <dt>
              <ArrowDownLeft size={14} strokeWidth={2.5} aria-hidden />
              Uang masuk
            </dt>
            <dd>{rupiah(income)}</dd>
          </div>
          <div>
            <dt>
              <ArrowUpRight size={14} strokeWidth={2.5} aria-hidden />
              Uang keluar
            </dt>
            <dd>{rupiah(expenses)}</dd>
          </div>
        </dl>
      </section>
      <div className="bank-ledger">
        <JournalFilterPills filter={filter} onChange={setFilter} />
        <JournalList filter={filter} withItems={false} withTime />
      </div>
    </>
  );
}

export function CngBankApp() {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const error = useWarung((s) => s.error);
  const paying = useHud((s) => s.cngbankPay);
  const fromInbox = useHud((s) => s.inboxDestination?.app === "cngbank");
  const [view, setView] = useState<BankView>(fromInbox ? "bills" : "home");
  const [concealed, setConcealed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const backButton = useRef<HTMLButtonElement>(null);
  const returnTo = useRef<string | null>(null);
  useEffect(() => {
    if (!data && !busy && !error) void warungCommand("read");
  }, [data, busy, error]);
  useEffect(() => {
    if (view !== "home") backButton.current?.focus();
    else if (returnTo.current) {
      panel.current
        ?.querySelector<HTMLButtonElement>(`[data-bank-action="${returnTo.current}"]`)
        ?.focus();
      returnTo.current = null;
    }
  }, [view]);

  const w = data?.warung;
  const detail = w && !paying ? destinations.find(({ id }) => id === view) : undefined;
  const due = (data?.rent?.owedDays ?? 0) > 0;
  function open(next: BankView, trigger: string = next) {
    returnTo.current = trigger;
    setView(next);
  }

  return (
    <PhoneAppScreen
      app="cngbank"
      title={detail?.label ?? "CNG Bank"}
      backAction={
        detail
          ? {
              label: fromInbox ? "Kembali ke notifikasi" : "Kembali ke beranda CNG Bank",
              icon: <ChevronLeft aria-hidden />,
              buttonRef: backButton,
              onClick: () => (fromInbox ? useHud.getState().openFeed("inbox") : setView("home")),
            }
          : null
      }
    >
      {!data || !w ? (
        <div className="bank-app bank-message" data-cngbank>
          <NotebookTabs aria-hidden size={27} />
          <p role={error && !data ? "alert" : "status"}>
            {data ? "Buka warung untuk memakai CNG Bank." : error || "Memuat rekening…"}
          </p>
          {data ? (
            <button
              type="button"
              className="bank-primary"
              onClick={() => useHud.getState().setSheet("warung")}
            >
              Buka Warungku
            </button>
          ) : (
            error && (
              <button
                type="button"
                className="bank-primary"
                disabled={busy}
                onClick={() => void warungCommand("read")}
              >
                Coba lagi
              </button>
            )
          )}
        </div>
      ) : paying ? (
        <CngBankPay />
      ) : (
        <div className="bank-app" ref={panel} data-cngbank>
          <div className="bank-scroll" key={view}>
            {view === "home" ? (
              <>
                <section className="bank-balance" aria-label="Rekening usaha">
                  <div className="bank-balance-heading">
                    <span>Saldo kas usaha</span>
                    <button
                      type="button"
                      aria-label={concealed ? "Tampilkan saldo" : "Sembunyikan saldo"}
                      onClick={() => setConcealed(!concealed)}
                    >
                      {concealed ? <EyeOff size={17} aria-hidden /> : <Eye size={17} aria-hidden />}
                    </button>
                  </div>
                  <strong className="bank-amount">
                    {concealed ? (
                      <span aria-label="Saldo tersembunyi">Rp ••••••</span>
                    ) : (
                      rupiah(w.cash)
                    )}
                  </strong>
                  <span className="bank-owner">{w.name}</span>
                </section>
                <nav className="bank-actions" aria-label="Layanan CNG Bank">
                  {destinations
                    .filter(({ id }) => id !== "credit" || data.kasbon)
                    .map(({ id, label, icon: Icon }) => (
                      <button type="button" key={id} data-bank-action={id} onClick={() => open(id)}>
                        <span className="bank-action-icon">
                          <Icon aria-hidden size={21} />
                        </span>
                        {label}
                        {id === "bills" && due && (
                          <span className="bank-due-dot" aria-label="Ada tagihan belum dibayar" />
                        )}
                      </button>
                    ))}
                </nav>
                <section className="bank-recent bank-ledger" aria-label="Transaksi terakhir">
                  <div className="bank-section-heading">
                    <h3>Transaksi terakhir</h3>
                    {data.journal.length > 3 && (
                      <button
                        type="button"
                        data-bank-action="all"
                        onClick={() => open("journal", "all")}
                      >
                        Lihat semua
                      </button>
                    )}
                  </div>
                  {data.journal.length ? (
                    <JournalList filter="all" withItems={false} withTime limit={3} />
                  ) : (
                    <p className="bank-empty">Belum ada transaksi kas.</p>
                  )}
                </section>
              </>
            ) : (
              <div className="bank-detail">
                {view === "bills" && <BankBill rent={data.rent} cash={w.cash} />}
                {view === "credit" &&
                  (data.kasbon ? (
                    <KasbonCard />
                  ) : (
                    <p className="bank-empty">Kasbon belum tersedia.</p>
                  ))}
                {view === "journal" && <BankHistory journal={data.journal} />}
              </div>
            )}
          </div>
        </div>
      )}
    </PhoneAppScreen>
  );
}
