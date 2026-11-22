import { useEffect } from "react";
import { ojekCommand, useOjek } from "@/game/ojek/store";

const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

/** Phone app: motor dealer + "Ambil penumpang". Money is Kas usaha (shared with the warung). */
export function OjekPanel() {
  const data = useOjek((s) => s.data);
  const busy = useOjek((s) => s.busy);
  const error = useOjek((s) => s.error);
  const picked = useOjek((s) => s.picked);
  useEffect(() => void ojekCommand("read"), []);

  if (!data) return <p className="p-4 text-sm">{error ?? "Memuat ojek…"}</p>;
  const { ojek, motors } = data;
  if (!ojek.hasWarung)
    return (
      <p className="p-4 text-sm">Buka warung dulu. Motor dibeli pakai Kas usaha dari warungmu.</p>
    );
  const order = ojek.order;
  const current = ojek.motor;

  return (
    <div className="flex flex-col gap-3 p-4 text-sm">
      <p>
        Kas usaha: <b>{rp(ojek.cash ?? 0)}</b> · Narik jam ini {ojek.tripsThisHour}/
        {ojek.tripsPerHourCap}
      </p>
      {error && <p className="text-red-700">{error}</p>}

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
                className="pointer-events-auto rounded-md bg-[#2f7d59] px-3 py-1 text-white disabled:opacity-50"
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
        ) : order ? (
          <p>
            {picked === order.id
              ? `Antar ke ${order.dropoff.name}`
              : `Jemput penumpang di ${order.pickup.name}`}{" "}
            · ongkos {rp(order.fare)}. Naik motor (bebek/skuter di parkiran) lalu ikuti penanda.
          </p>
        ) : (
          <button
            type="button"
            className="pointer-events-auto rounded-md bg-[#f2a33c] px-3 py-2 font-bold disabled:opacity-50"
            disabled={busy || ojek.tripsThisHour >= ojek.tripsPerHourCap}
            onClick={() => void ojekCommand("accept")}
          >
            Ambil penumpang
          </button>
        )}
      </section>
    </div>
  );
}
