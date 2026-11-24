import { useEffect, useState } from "react";
import { useFishing } from "@/game/fishing/store";
import { KULI_DELIVERIES, KULI_TIME_MS } from "@/game/easyjobs/model";
import { loadJobs, tickKuli, useEasyJobs } from "@/game/easyjobs/store";
import "./context-actions.css";

/** Basket, fish for sale and kuli progress; all values come from the server. */
export function EasyJobsHud() {
  const [, bump] = useState(0),
    s = useEasyJobs(),
    fishing = useFishing((f) => f.open);
  useEffect(() => void loadJobs(), []);
  useEffect(() => {
    if (!s.kuli) return;
    const t = setInterval(() => (tickKuli(), bump((n) => n + 1)), 1000);
    return () => clearInterval(t);
  }, [s.kuli]);
  const fruit = Object.values(s.basket).reduce((n, c) => n + c, 0);
  if (fishing || (!fruit && !s.fishBag.length && !s.kuli)) return null;
  const left = s.kuli
    ? Math.max(0, Math.ceil((s.kuli.startedAt + KULI_TIME_MS - Date.now()) / 1000))
    : 0;
  return (
    <div className="activity-status" data-easy-jobs>
      <div className="activity-status-line">
        <span role="status">
          {s.kuli
            ? `Kuli ${s.kuli.done}/${KULI_DELIVERIES} · ${left}s · ${s.kuli.carrying ? "Antar ke kios bertanda" : "Ambil karung di truk"}`
            : `Keranjang ${fruit} buah · Dompet ikan ${s.fishBag.length} ekor`}
        </span>
      </div>
    </div>
  );
}
