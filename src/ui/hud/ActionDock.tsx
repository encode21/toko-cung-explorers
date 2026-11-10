import { MissionDot } from "./MissionNotifications";
import { useHud, type HudSheet } from "@/state/hud-store";
import { useDungeon } from "@/game/dungeon/store";
import { isMountainPosition } from "@/game/mountain/model";
import { useGame } from "@/state/game-store";
import { HudMenuArtwork } from "./HudMenuArtwork";
import { SpawnButton } from "./SpawnButton";
import { StopGuidanceButton } from "./StopGuidanceButton";
import { useReactiveWorld } from "@/game/reactive-world/store";
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
  const mountain = useGame((s) => isMountainPosition(s.playerPos[0], s.playerPos[2]));
  const sheet = useHud((s) => s.sheet);
  const toggle = useHud((s) => s.toggleSheet);
  const pahlawan = useReactiveWorld((s) =>
    s.events.some((e) => e.type === "NATIONAL_DAY" && e.payload.theme === "pahlawan"),
  );

  const press = (id: Exclude<HudSheet, null> | "quests") => {
    if (id === "quests") {
      toggle("quests");
    } else toggle(id);
  };

  return (
    <div
      data-world-dock
      data-featured-event={(pahlawan && !dungeon) || undefined}
      className="mmo-side-menus"
    >
      {pahlawan && !dungeon && (
        <button
          type="button"
          data-hud-control
          data-side-action="pahlawan-event"
          className="mmo-event-shortcut"
          onClick={() => toggle("pahlawan-event")}
          aria-label="Pahlawan"
          aria-haspopup="dialog"
          aria-expanded={sheet === "pahlawan-event"}
        >
          <span>
            <small>EVENT TERBATAS</small>
            <strong>HARI PAHLAWAN</strong>
          </span>
        </button>
      )}
      {(["left", "right"] as const).map((side) => (
        <nav
          key={side}
          aria-label={`Menu ${side === "left" ? "kiri" : "kanan"}`}
          data-side-menu={side}
          className={`mmo-side-menu mmo-side-menu-${side}`}
        >
          {MENUS[side]
            .filter(
              ({ id }) =>
                (!mountain || id !== "explore") && (!dungeon || id === "phone" || id === "quests"),
            )
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
                {id === "daily-missions" && <MissionDot scope="daily" />}
                {id === "quests" && <MissionDot scope="quests" />}
                {id === "phone" && <MissionDot scope="inventory" />}
                <span className="mmo-side-label">{label}</span>
              </button>
            ))}
          {side === "right" && !dungeon && !sheet && <SpawnButton />}
          {side === "left" && !dungeon && !sheet && <StopGuidanceButton />}
        </nav>
      ))}
    </div>
  );
}
