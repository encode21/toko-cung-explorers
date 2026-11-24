import { useEffect, useMemo, useState } from "react";
import { weatherAt } from "@/game/weather/cycle";
import { GAME_HOUR_MS, gameDate, gameDateStart, gameMoment } from "@/game/time/calendar";
import { useSceneTime } from "@/game/time/scene-time";
import { useWarung } from "@/game/warung/store";
import { isWarungOpenAt, rupiah, type WarungDebt } from "@/game/warung/model";

/** Due date in the game calendar (debts follow game days, not the wall clock). */
export function formatDue(iso: string) {
  const ms = Date.parse(iso);
  return Number.isNaN(ms) ? iso : gameMoment(ms);
}
/** Game hours of a game date with rain (weather runs on the shared wall clock). */
function rainOnGameDate(date: string) {
  const start = gameDateStart(date);
  return Array.from({ length: 24 }, (_, h) => h).filter(
    (h) => weatherAt(start + h * GAME_HOUR_MS + GAME_HOUR_MS / 2).rain > 0,
  );
}

const pad = (n: number) => String(n).padStart(2, "0");
const until = (from: number, target: number) => (target - from + 1440) % 1440;

/** Full game month: game dates, rain, debts due, and the warung open/close hours. */
export function RainCalendar({ debts = [] }: { debts?: WarungDebt[] }) {
  const today = gameDate(Date.now());
  const gameHour = useSceneTime((s) => s.hour);
  const gameMinute = useSceneTime((s) => s.minute);
  const warung = useWarung((s) => s.data?.warung);
  const dated = debts.flatMap((debt) => {
    const ms = Date.parse(debt.dueAt);
    return Number.isNaN(ms) ? [] : [{ debt, date: gameDate(ms) }];
  });
  const [month, setMonth] = useState(() => today.slice(0, 7));
  const [shown, setShown] = useState(today);
  const [openDay, setOpenDay] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setOpenDay(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const grid = monthCells(month);
  const wetDays = useMemo(() => {
    const flags = new Set<string>();
    for (const cell of monthCells(month).cells)
      if (cell && rainOnGameDate(cell.date).length) flags.add(cell.date);
    return flags;
  }, [month]);
  const title = new Intl.DateTimeFormat("id-ID", {
    timeZone: "UTC",
    month: "long",
    year: "numeric",
  }).format(Date.parse(`${month}-01T00:00:00Z`));
  const rain = useMemo(() => rainOnGameDate(shown), [shown]);
  const open = warung?.openHour ?? 6;
  const close = warung?.closeHour ?? 22;
  const always = open === close;
  const openNow = warung ? isWarungOpenAt(open, close, gameHour) : false;
  const gameMins = gameHour * 60 + gameMinute;
  const soonOpen = !!warung && !always && !openNow && until(gameMins, open * 60) <= 60;
  const soonClose = !!warung && !always && openNow && until(gameMins, close * 60) <= 60;
  const onDay = dated.filter((row) => row.date === shown);
  const hoursLabel = !warung
    ? ""
    : always
      ? " · Buka 24 jam"
      : ` · ${openNow ? "Buka" : "Tutup"} ${pad(open)}.00–${pad(close)}.00`;
  return (
    <section className="warung-journal" aria-label="Kalender">
      <div className="warung-journal-head">
        <h4>Kalender</h4>
        <div className="day-cal-nav">
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, -1))}
            aria-label="Bulan sebelumnya"
          >
            ‹
          </button>
          <span>{title}</span>
          <button
            type="button"
            onClick={() => setMonth(shiftMonth(month, 1))}
            aria-label="Bulan berikutnya"
          >
            ›
          </button>
        </div>
      </div>
      <p className={`cal-clock${soonOpen || soonClose ? " is-soon" : ""}`}>
        <span>
          {shown === today ? "Hari ini" : ""} {pad(gameHour)}.{pad(gameMinute)}
          {hoursLabel}
        </span>
        {soonOpen && <b>Sebentar lagi buka</b>}
        {soonClose && <b>Sebentar lagi tutup</b>}
      </p>
      <div className="month-cal" role="grid" aria-label={title}>
        {["M", "S", "S", "R", "K", "J", "S"].map((name, index) => (
          <span key={name + index} className="month-cal-dow">
            {name}
          </span>
        ))}
        {grid.cells.map((cell, index) =>
          cell ? (
            <button
              key={cell.date}
              type="button"
              aria-pressed={openDay && shown === cell.date}
              aria-expanded={openDay && shown === cell.date}
              data-due={dated.some((row) => row.date === cell.date) || undefined}
              data-rain={wetDays.has(cell.date) || undefined}
              data-today={cell.date === today || undefined}
              onClick={() => {
                if (shown === cell.date && openDay) {
                  setOpenDay(false);
                  return;
                }
                setShown(cell.date);
                setOpenDay(true);
              }}
            >
              {cell.day}
            </button>
          ) : (
            <span key={`gap-${index}`} />
          ),
        )}
      </div>
      <div className="day-board" data-open={openDay || undefined}>
        <div>
          <div className="day-board-body">
            <p className="warung-hint">
              {shown === today ? "Hari ini" : shown} · ketuk tanggal yang sama untuk menutup. Biru =
              hujan, oranye berkedip = jam buka atau tutup.
            </p>
            <div className="hour-board" role="list" aria-label={`Jam ${shown}`}>
              {Array.from({ length: 24 }, (_, hour) => {
                const shop = warung ? isWarungOpenAt(open, close, hour) : false;
                const edge = !!warung && !always && (hour === open || hour === close);
                const now = shown === today && hour === gameHour;
                const title = [
                  edge && hour === open ? "Buka" : "",
                  edge && hour === close ? "Tutup" : "",
                  rain.includes(hour) ? "Hujan" : "",
                  now ? "Sekarang" : "",
                ]
                  .filter(Boolean)
                  .join(" · ");
                return (
                  <span
                    key={hour}
                    role="listitem"
                    title={title || undefined}
                    data-open={shop || undefined}
                    data-rain={rain.includes(hour) || undefined}
                    data-edge={edge || undefined}
                    data-now={now || undefined}
                  >
                    {pad(hour)}
                  </span>
                );
              })}
            </div>
            {onDay.length > 0 ? (
              <ul>
                {onDay.map(({ debt }) => (
                  <li key={debt.id}>
                    <span>
                      Tagih {debt.npc} · {formatDue(debt.dueAt)}
                    </span>
                    <b>{rupiah(debt.amount)}</b>
                  </li>
                ))}
              </ul>
            ) : (
              dated.length > 0 && <p className="warung-hint">Tidak ada tagihan di tanggal ini.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function monthCells(anchor: string) {
  const [year, month] = anchor.split("-").map(Number) as [number, number];
  // Game dates are plain calendar dates (no timezone); Monday-first grid.
  const lead = (new Date(Date.UTC(year!, month! - 1, 1)).getUTCDay() + 6) % 7;
  const count = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  const cells: ({ date: string; day: number } | null)[] = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day++) {
    cells.push({ day, date: `${anchor}-${String(day).padStart(2, "0")}` });
  }
  return { year, month, cells };
}

function shiftMonth(anchor: string, by: number) {
  const [year, month] = anchor.split("-").map(Number) as [number, number];
  const next = new Date(Date.UTC(year!, month! - 1 + by, 1));
  return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}`;
}
