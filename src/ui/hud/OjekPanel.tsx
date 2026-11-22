import { useEffect, useState } from "react";
import { ojekCommand, summonMotor, useOjek } from "@/game/ojek/store";
import { useHud } from "@/state/hud-store";
import "./usaha-panel.css";

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
  const canDrive = !!data && !data.ojek.job;

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
  const { order, job, ride } = ojek;
  const current = ojek.motor;
  const capped = ojek.tripsThisHour >= ojek.tripsPerHourCap;

  return (
    // Own scroll container: the sheet body (game-scroll-flush) is overflow-hidden.
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto p-4 text-sm">
      <p>
        {ojek.hasWarung ? (
          <>
            Kas usaha: <b>{rp(ojek.cash ?? 0)}</b>
          </>
        ) : (
          <>
            Tabungan modal: <b>{rp(ojek.savings)}</b>
          </>
        )}{" "}
        · Narik jam ini {ojek.tripsThisHour}/{ojek.tripsPerHourCap}
      </p>
      {!ojek.hasWarung && (
        <p className="rounded-lg bg-black/5 p-2">
          Belum punya usaha? Narik pakai motor umum di parkiran dulu. Hasilnya ditabung dan jadi
          modal tambahan saat kamu buka warung. Pesan ojek & beli motor butuh warung.
        </p>
      )}
      {error && <p className="text-red-700">{error}</p>}

      {ojek.hasWarung && (
        <>
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
              <div className="flex flex-col gap-2">
                <div className="ojek-dest-grid" role="radiogroup" aria-label="Tujuan ojek">
                  {spots.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      role="radio"
                      aria-checked={dropoff === s.id}
                      className="ojek-dest"
                      onClick={() => setDropoff(s.id)}
                    >
                      {s.name}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  className={`${BUTTON} bg-[#f2a33c] font-bold`}
                  disabled={busy || !dropoff}
                  onClick={() => void ojekCommand("order_ride", { dropoff })}
                >
                  {dropoff
                    ? `Pesan ke ${spots.find((x) => x.id === dropoff)?.name ?? "tujuan"}`
                    : "Pilih tujuan dulu"}
                </button>
              </div>
            )}
            <p className="text-xs opacity-70">
              Ongkos ditahan dari Kas usaha dan kembali kalau batal atau tidak ada driver.
            </p>
          </section>
        </>
      )}
      <p className="rounded-lg bg-black/5 p-2">
        Motor umum di parkiran gratis dipakai, tapi kalau narik ojek pakai motor juragan, setoran{" "}
        {ojek.setoranPercent}% dari ongkos. Motor sendiri: tanpa setoran, ongkos naik sesuai tipe,
        dan bisa dipanggil di mana saja.
      </p>
      {current && (
        <button
          type="button"
          className={`${BUTTON} bg-[#2f7d59] py-2 font-bold text-white`}
          disabled={busy}
          onClick={() => {
            useHud.getState().setSheet(null);
            void summonMotor();
          }}
        >
          Panggil motorku ({current.name})
        </button>
      )}
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
                disabled={busy || !ojek.hasWarung || owned || lower || (ojek.cash ?? 0) < m.price}
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
        {job ? (
          <p>
            Jemput <b>{job.passenger}</b>, berhenti di dekatnya lalu tekan &quot;Ajak bonceng&quot;.
            Antar ke {job.dropoff.name} · {rp(job.fare)}.
          </p>
        ) : order ? (
          <p>
            {picked === order.id
              ? `Antar ke ${order.dropoff.name}`
              : `Jemput penumpang di ${order.pickup.name}, berhenti di dekatnya`}{" "}
            · motor umum {rp(order.publicPayout)}
            {order.ownPayout !== null ? ` · motormu ${rp(order.ownPayout)}` : ""}. Tetap di atas
            motor sampai tujuan.
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
            {error && <p className="text-red-700">{error}</p>}
            <p className="text-xs opacity-70">
              Naik motor dulu (motor umum di parkiran atau Panggil motorku), baru ambil penumpang.
            </p>
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
