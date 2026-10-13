import { Compass, Map, Flag } from "lucide-react";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import { GameMenu } from "./GameMenu";
import { useDungeon } from "@/game/dungeon/store";

const ITEMS: {
  id: "map" | "explore" | "quests";
  label: string;
  Icon: typeof Map;
}[] = [
  { id: "map", label: "Peta", Icon: Map },
  { id: "explore", label: "Jelajah", Icon: Compass },
  { id: "quests", label: "Quest", Icon: Flag },
];

/** Compact navigation; chat has its own preview above the dock. */
export function ActionDock() {
  const dungeon = useDungeon((s) => !!s.data?.instance);
  const sheet = useHud((s) => s.sheet);
  const toggle = useHud((s) => s.toggleSheet);
  const setSheet = useHud((s) => s.setSheet);
  const openKiosk = useGame((s) => s.openKiosk);

  const press = (id: (typeof ITEMS)[number]["id"]) => {
    if (id === "quests") {
      setSheet(null);
      openKiosk();
    } else toggle(id);
  };

  return (
    <nav aria-label="Dock aksi" data-world-dock data-hud-control className="mmo-actionbar">
      {!dungeon &&
        ITEMS.map(({ id, label, Icon }) => {
          const active = sheet === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => press(id)}
              aria-label={label}
              aria-pressed={active}
              className={`mmo-actionbar-button ${active ? "is-active" : ""}`}
            >
              <Icon className="size-3.5" />
              <span className="font-semibold text-[10px] leading-none">{label}</span>
            </button>
          );
        })}
      <GameMenu />
    </nav>
  );
}
