import type { WarungDecorItem } from "@/game/warung/decor";
import { rupiah } from "@/game/warung/model";
import { useWarung, warungCommand } from "@/game/warung/store";

const GROUPS: { slot: WarungDecorItem["slot"]; title: string }[] = [
  { slot: "wall", title: "🎨 Cat dinding" },
  { slot: "awning", title: "⛱️ Kanopi depan" },
  { slot: "floor", title: "🟫 Lantai" },
  { slot: "extra", title: "✨ Dekorasi" },
];

/** Kustom warung: buy once from Kas, then switch freely. Visitors see the same look. */
export function WarungDecorTab() {
  const data = useWarung((s) => s.data);
  const busy = useWarung((s) => s.busy);
  const w = data?.warung;
  if (!w || !data?.decor || !w.style) return null;
  const style = w.style;
  return (
    <div className="warung-list">
      <p className="warung-hint">
        Bikin pengunjung bilang “Wah!”. Beli sekali pakai Kas usaha, ganti kapan saja. Masuk warung
        untuk lihat hasilnya.
      </p>
      {GROUPS.map((g) => (
        <section key={g.slot} className="warung-card" aria-label={g.title}>
          <div className="warung-card-head">
            <strong>{g.title}</strong>
          </div>
          <ul className="warung-rec-items warung-lot-list">
            {data
              .decor!.filter((d) => d.slot === g.slot)
              .map((d) => {
                const owned = d.price === 0 || style.owned.includes(d.id);
                const active =
                  d.slot === "extra" ? style.extras.includes(d.id) : style[d.slot] === d.id;
                const lockedLevel = !owned && w.level < d.level;
                return (
                  <li key={d.id} data-selected={active || undefined}>
                    <span>
                      {d.name}
                      <small>
                        {d.price ? rupiah(d.price) : "Bawaan"}
                        {d.level > 1 ? ` · warung Lv.${d.level}` : ""}
                      </small>
                    </span>
                    {!owned ? (
                      <button
                        type="button"
                        className="warung-cta"
                        disabled={busy || lockedLevel || w.cash < d.price}
                        onClick={() => void warungCommand("decor_buy", { decorId: d.id })}
                      >
                        {lockedLevel ? `Lv.${d.level}` : w.cash < d.price ? "Kas kurang" : "Beli"}
                      </button>
                    ) : d.slot === "extra" ? (
                      <button
                        type="button"
                        className="warung-secondary"
                        disabled={busy}
                        aria-pressed={active}
                        onClick={() =>
                          void warungCommand("decor_apply", { decorId: d.id, on: !active })
                        }
                      >
                        {active ? "Lepas" : "Pasang"}
                      </button>
                    ) : active ? (
                      <b className="warung-demand" data-tone="good">
                        Dipakai
                      </b>
                    ) : (
                      <button
                        type="button"
                        className="warung-secondary"
                        disabled={busy}
                        onClick={() => void warungCommand("decor_apply", { decorId: d.id })}
                      >
                        Pakai
                      </button>
                    )}
                  </li>
                );
              })}
          </ul>
        </section>
      ))}
    </div>
  );
}
