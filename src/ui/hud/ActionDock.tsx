import { MissionDot } from "./MissionNotifications";
import { useHud, type HudSheet } from "@/state/hud-store";
import { useDungeon } from "@/game/dungeon/store";
import { isMountainPosition } from "@/game/mountain/model";
import { useGame } from "@/state/game-store";
import { HudMenuArtwork } from "./HudMenuArtwork";
import { SpawnButton } from "./SpawnButton";
import { StopGuidanceButton } from "./StopGuidanceButton";
import { useMobility } from "@/game/mobility/store";
import { connectionId } from "@/net/channel-store";
import "./side-menus.css";

const MENUS = {
  left: [
    { id: "daily-missions", label: "Daily Mission" },
    { id: "shop", label: "Shop" },
    { id: "quests", label: "Kerja Sambilan" },
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
  // Driving frees the right column for the speedometer; the phone stays (ojol needs it on the road).
  const driving = useMobility((s) =>
    (s.vehicles ?? []).some((v) =>
      v.occupants.some(
        (o) => o.connectionId === connectionId && o.seat === 0 && o.status === "active",
      ),
    ),
  );
  const toggle = useHud((s) => s.toggleSheet);

  const press = (id: Exclude<HudSheet, null> | "quests") => {
    if (id === "quests") {
      toggle("quests");
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
            .filter(
              ({ id }) =>
                (!mountain || id !== "explore") &&
                (!dungeon || id === "phone" || id === "quests") &&
                (!driving || side === "left" || id === "phone"),
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
          {side === "right" && !dungeon && !sheet && !driving && <SpawnButton />}
          {side === "left" && !dungeon && !sheet && <StopGuidanceButton />}
        </nav>
      ))}
    </div>
  );
}
