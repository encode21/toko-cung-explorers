import { useGame } from "@/state/game-store";
import { useHud, type HudSheet } from "@/state/hud-store";
import { useDungeon } from "@/game/dungeon/store";
import { HudMenuArtwork } from "./HudMenuArtwork";
import "./side-menus.css";

const MENUS = {
  left: [
    { id: "daily-missions", label: "Daily Mission" },
    { id: "shop", label: "Shop" },
    { id: "quests", label: "Quest" },
  ],
  right: [
    { id: "explore", label: "Jelajah" },
    { id: "daily-login", label: "Login Harian" },
    { id: "phone", label: "Handphone" },
  ],
} as const;

/** Floating side shortcuts leave the centre of the world and movement controls clear. */
export function ActionDock() {
  const dungeon = useDungeon((s) => !!s.data?.instance);
  const sheet = useHud((s) => s.sheet);
  const toggle = useHud((s) => s.toggleSheet);
  const setSheet = useHud((s) => s.setSheet);
  const openKiosk = useGame((s) => s.openKiosk);

  const press = (id: Exclude<HudSheet, null> | "quests") => {
    if (id === "quests") {
      setSheet(null);
      openKiosk();
    } else toggle(id);
  };

  return (
    <div data-world-dock className="mmo-side-menus">
      {(["left", "right"] as const).map((side) => (
        <nav
          key={side}
          aria-label={`Menu ${side === "left" ? "kiri" : "kanan"}`}
          data-side-menu={side}
          className={`mmo-side-menu mmo-side-menu-${side}`}
        >
          {MENUS[side]
            .filter(({ id }) => !dungeon || id === "phone")
            .map(({ id, label }) => (
              <button
                key={id}
                type="button"
                data-hud-control
                data-side-action={id}
                onClick={() => press(id)}
                aria-label={label}
                aria-haspopup="dialog"
                aria-expanded={sheet === id}
                className={`mmo-side-button ${sheet === id ? "is-active" : ""}`}
              >
                <HudMenuArtwork kind={id} />
                <span className="mmo-side-label">{label}</span>
              </button>
            ))}
        </nav>
      ))}
    </div>
  );
}
