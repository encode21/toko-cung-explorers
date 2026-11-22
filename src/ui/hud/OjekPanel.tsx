import { useEffect, useState } from "react";
import { ojekCommand, useOjek } from "@/game/ojek/store";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
const BUTTON = "pointer-events-auto rounded-md px-3 py-1 disabled:opacity-50";

/** Phone app: motor dealer, NPC jobs, ordering a ride and taking other players' orders. Money is Kas usaha. */
export function OjekPanel() {
  const data = useOjek((s) => s.data);
  const rides = useOjek((s) => s.rides);
  const busy = useOjek((s) => s.busy);
  const error = useOjek((s) => s.error);
  const picked = useOjek((s) => s.picked);
  const [dropoff, setDropoff] = useState("");
  const canDrive = !!data?.ojek.motor && !data.ojek.job;

  useEffect(() => void ojekCommand("read"), []);
  // Drivers see fresh player orders while the app is open.
  useEffect(() => {
    if (!canDrive) return;
    void ojekCommand("rides");
    const t = setInterval(() => void ojekCommand("rides"), 5000);
    return () => clearInterval(t);
  }, [canDrive]);

  if (!data) return <p className="p-4 text-sm">{error ?? "Memuat ojek…"}</p>;
  const { ojek, motors, spots } = data;
  if (!ojek.hasWarung)
    return (
      <p className="p-4 text-sm">Buka warung dulu. Ojek dibayar pakai Kas usaha dari warungmu.</p>
    );
  const { order, job, ride } = ojek;
  const current = ojek.motor;
  const capped = ojek.tripsThisHour >= ojek.tripsPerHourCap;

  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <p>
        Kas usaha: <b>{rp(ojek.cash ?? 0)}</b> · Narik jam ini {ojek.tripsThisHour}/
        {ojek.tripsPerHourCap}
      </p>
      {error && <p className="text-red-700">{error}</p>}

      <section className="flex flex-col gap-2">
        <h3 className="font-bold">Pesan Ojek</h3>
        {ride ? (
          <div className="flex items-center justify-between gap-2">
            <span>
              Ke {ride.dropoff.name} · {rp(ride.fare)} ·{" "}
              {ride.status === "open"
                ? "mencari driver…"
                : `${ride.driver ?? "Driver"} menuju lokasimu`}
            </span>
            <button
              type="button"
              className={`${BUTTON} bg-black/10`}
              disabled={busy}
              onClick={() => void ojekCommand("cancel_ride", { rideId: ride.id })}
            >
              Batal
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <select
              aria-label="Tujuan ojek"
              className="pointer-events-auto flex-1 rounded-md bg-black/5 p-1"
              value={dropoff}
              onChange={(e) => setDropoff(e.target.value)}
            >
              <option value="">Pilih tujuan…</option>
              {spots.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className={`${BUTTON} bg-[#f2a33c] font-bold`}
              disabled={busy || !dropoff}
              onClick={() => void ojekCommand("order_ride", { dropoff })}
            >
              Pesan
            </button>
          </div>
        )}
        <p className="text-xs opacity-70">
          Ongkos ditahan dari Kas usaha dan kembali kalau batal atau tidak ada driver.
        </p>
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-bold">Dealer Motor</h3>
        {motors.map((m) => {
          const owned = current?.id === m.id;
          const lower = !!current && m.price <= current.price;
          return (
            <div
              key={m.id}
              className="flex items-center justify-between gap-2 rounded-lg bg-black/5 p-2"
            >
              <span>
                <b>{m.name}</b> · {rp(m.price)} · ongkos {m.fare_percent}%
              </span>
              <button
                type="button"
                className={`${BUTTON} bg-[#2f7d59] text-white`}
                disabled={busy || owned || lower || (ojek.cash ?? 0) < m.price}
                onClick={() => void ojekCommand("buy_motor", { model: m.id })}
              >
                {owned ? "Punyamu" : "Beli"}
              </button>
            </div>
          );
        })}
      </section>

      <section className="flex flex-col gap-2">
        <h3 className="font-bold">Narik Ojek</h3>
        {!current ? (
          <p>Beli motor dulu untuk mulai narik.</p>
        ) : job ? (
          <p>
            Jemput <b>{job.passenger}</b>, berhenti di dekatnya lalu tekan &quot;Ajak bonceng&quot;.
            Antar ke {job.dropoff.name} · {rp(job.fare)}.
          </p>
        ) : order ? (
          <p>
            {picked === order.id
              ? `Antar ke ${order.dropoff.name}`
              : `Jemput penumpang di ${order.pickup.name}, berhenti di dekatnya`}{" "}
            · ongkos {rp(order.fare)}. Naik motor (bebek/skuter di parkiran) lalu ikuti penanda.
          </p>
        ) : (
          <>
            <button
              type="button"
              className={`${BUTTON} bg-[#f2a33c] py-2 font-bold`}
              disabled={busy || capped}
              onClick={() => void ojekCommand("accept")}
            >
              Ambil penumpang NPC
            </button>
            <h4 className="font-bold">Order dari pemain</h4>
            {rides.length === 0 && <p className="opacity-70">Belum ada pesanan di channel ini.</p>}
            {rides.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between gap-2 rounded-lg bg-black/5 p-2"
              >
                <span>
                  <b>{r.passenger}</b> → {r.dropoff.name} · {rp(r.fare)}
                </span>
                <button
                  type="button"
                  className={`${BUTTON} bg-[#2f7d59] text-white`}
                  disabled={busy || capped}
                  onClick={() => void ojekCommand("claim_ride", { rideId: r.id })}
                >
                  Ambil
                </button>
              </div>
            ))}
          </>
        )}
      </section>
    </div>
  );
}
