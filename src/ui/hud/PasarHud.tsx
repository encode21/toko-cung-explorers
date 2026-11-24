import { useEasyJobs, sellFish, sellFruit } from "@/game/easyjobs/store";
import { kioskById } from "@/game/pasar/model";
import { buyFood, closePasar, usePasar } from "@/game/pasar/store";
import { rupiah } from "@/game/warung/model";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import { FishIcon } from "./FishIcon";
import { WarungKasBalance } from "./WarungKasBalance";
import "./pasar.css";

/** Kiosk shop sheet: eat for energy (paid from Kas usaha) and, at Buah / Ikan, sell what you picked or caught. */
export function PasarHud() {
  const open = usePasar((s) => s.open),
    busy = usePasar((s) => s.busy),
    jobs = useEasyJobs();
  const k = open ? kioskById(open) : null;
  if (!k) return null;
  const fruit = Object.values(jobs.basket).reduce((n, c) => n + c, 0);
  return (
    <GameModal
      title={k.name}
      subtitle={`${k.vendor} · makan buat isi energi`}
      headerAccessory={<WarungKasBalance />}
      onClose={closePasar}
    >
      <div className="pasar-sheet" data-pasar>
        <h3>Menu</h3>
        {k.menu.map((m) => (
          <div className="pasar-row" key={m.id}>
            <span>
              {m.name}
              <small>
                {rupiah(m.price)} · ⚡ +{m.energy}
              </small>
            </span>
            <GameButton disabled={busy} onClick={() => void buyFood(k.id, m)}>
              Beli &amp; makan
            </GameButton>
          </div>
        ))}
        {k.id === "buah" && (
          <>
            <h3>Jual</h3>
            <div className="pasar-row">
              <span>Keranjang buah · {fruit} buah</span>
              <GameButton disabled={!fruit} onClick={() => void sellFruit()}>
                Jual buah
              </GameButton>
            </div>
          </>
        )}
        {k.id === "ikan" && (
          <>
            <h3>Jual</h3>
            {jobs.fishBag.map((price, i) => (
              <div className="pasar-row" key={i}>
                <FishIcon id={jobs.fishIds[i] ?? null} />
                <span>{rupiah(price)}</span>
              </div>
            ))}
            <div className="pasar-row">
              <span>Dompet ikan · {jobs.fishBag.length} ekor</span>
              <GameButton disabled={!jobs.fishBag.length} onClick={() => void sellFish()}>
                Jual ikan
              </GameButton>
            </div>
          </>
        )}
      </div>
    </GameModal>
  );
}
