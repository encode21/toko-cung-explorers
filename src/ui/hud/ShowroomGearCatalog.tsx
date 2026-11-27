import { Circle, HardHat, Shirt } from "lucide-react";
import type { GarasiSnapshot } from "@/game/garasi/store";
import { rupiah } from "@/game/warung/model";
import { GameButton } from "@/ui/game-ui/GamePanel";

const sections = [
  { kind: "helmet", label: "Helm", reset: "Helm standar", Icon: HardHat },
  { kind: "jacket", label: "Jaket", reset: "Lepas jaket", Icon: Shirt },
  { kind: "paint", label: "Cat motor", reset: "Cat asli", Icon: Circle },
] as const;

export type ShowroomGearKind = (typeof sections)[number]["kind"];

export function ShowroomGearCatalog({
  data,
  busy,
  onBuy,
  onEquip,
}: {
  data: GarasiSnapshot;
  busy: boolean;
  onBuy: (kind: ShowroomGearKind, id: string, name: string, price: number) => void;
  onEquip: (kind: ShowroomGearKind, id: string) => void;
}) {
  const { cash, hasWarung, owned } = data.garasi;
  return (
    <div className="showroom-gear-catalog">
      {sections.map(({ kind, label, reset, Icon }) => (
        <section className="showroom-gear-group" key={kind} aria-label={label}>
          <h3>{label}</h3>
          {data.catalog[kind].map((item) => {
            const mine = owned.find((gear) => gear.kind === kind && gear.itemId === item.id);
            return (
              <div className="showroom-gear-offer" key={item.id}>
                <span className="showroom-gear-swatch" aria-hidden>
                  <Icon size={21} fill={item.color} />
                </span>
                <div>
                  <strong>{item.name}</strong>
                  <small>{mine ? "Dimiliki" : rupiah(item.price)}</small>
                </div>
                <GameButton
                  className={mine ? "game-button-soft" : undefined}
                  disabled={
                    busy || !hasWarung || mine?.equipped || (!mine && (cash ?? 0) < item.price)
                  }
                  onClick={() =>
                    mine ? onEquip(kind, item.id) : onBuy(kind, item.id, item.name, item.price)
                  }
                >
                  {mine?.equipped ? "Dipakai" : mine ? "Pakai" : "Beli"}
                </GameButton>
              </div>
            );
          })}
          {owned.some((item) => item.kind === kind && item.equipped) && (
            <GameButton
              className="game-button-soft"
              disabled={busy || !hasWarung}
              onClick={() => onEquip(kind, "none")}
            >
              {reset}
            </GameButton>
          )}
        </section>
      ))}
    </div>
  );
}
