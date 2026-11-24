import { useEasyJobs, sellFish, sellFruit } from "@/game/easyjobs/store";
import { kioskById } from "@/game/pasar/model";
import { buyFood, closePasar, usePasar } from "@/game/pasar/store";
import { rupiah } from "@/game/warung/model";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import { FishIcon } from "./FishIcon";
import { WarungKasBalance } from "./WarungKasBalance";
import "./pasar.css";

const KIOSK_EMOJI = { gorengan: "🍤", martabak: "🥞", buah: "🍉", ikan: "🐟" } as const;

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
      className="game-light pasar-modal"
      onClose={closePasar}
    >
      <div className="pasar-sheet game-light-grid" data-pasar>
        <h3 className="game-light-heading">Menu</h3>
        {k.menu.map((m) => (
          <div className="game-light-card" key={m.id}>
            <span className="game-light-icon" aria-hidden="true">
              {KIOSK_EMOJI[k.id]}
            </span>
            <span>
              <strong>{m.name}</strong>
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
            <h3 className="game-light-heading">Jual</h3>
            <div className="game-light-card">
              <span className="game-light-icon" aria-hidden="true">
                🧺
              </span>
              <span>
                <strong>Keranjang buah</strong>
                <small>{fruit} buah</small>
              </span>
              <GameButton disabled={!fruit} onClick={() => void sellFruit()}>
                Jual buah
              </GameButton>
            </div>
          </>
        )}
        {k.id === "ikan" && (
          <>
            <h3 className="game-light-heading">Jual</h3>
            {jobs.fishBag.map((price, i) => (
              <div className="game-light-card" key={i}>
                <FishIcon id={jobs.fishIds[i] ?? null} />
                <span>
                  <strong>{rupiah(price)}</strong>
                </span>
              </div>
            ))}
            <div className="game-light-card">
              <span>
                <strong>Dompet ikan</strong>
                <small>{jobs.fishBag.length} ekor</small>
              </span>
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
