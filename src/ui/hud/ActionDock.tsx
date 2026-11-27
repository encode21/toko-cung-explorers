import { Fragment, useEffect, useId, useRef, useState } from "react";
import { useAccount } from "@/auth/useSession";
import { useProlog } from "@/game/prolog/store";
import { DeliveryShortcut } from "./DeliveryShortcut";
import { MissionDot } from "./MissionNotifications";
import { useHud, type HudSheet } from "@/state/hud-store";
import { useDungeon } from "@/game/dungeon/store";
import { isMountainPosition } from "@/game/mountain/model";
import { useGame } from "@/state/game-store";
import { HudMenuArtwork } from "./HudMenuArtwork";
import { PhoneShortcut } from "./PhoneShortcut";
import { PrologShortcut } from "./PrologShortcut";
import { SpawnButton } from "./SpawnButton";
import { StopGuidanceButton } from "./StopGuidanceButton";
import { useMobility } from "@/game/mobility/store";
import { connectionId } from "@/net/channel-store";
import { claimBeginnerGuideTooltip } from "./announcements";
import "./side-menus.css";

const GUIDE_TOOLTIP_DURATION_MS = 6000;

const MENUS = {
  left: [
    { id: "daily-missions", label: "Daily Mission" },
    { id: "beginner-guide", label: "Panduan Pemula" },
    { id: "kulakan-book", label: "Buku Mbah" },
    { id: "quests", label: "Kerja Sambilan" },
  ],
  right: [
    { id: "explore", label: "Jelajah" },
    { id: "daily-login", label: "Login Harian" },
    { id: "phone", label: "Handphone" },
  ],
} as const;

/** Floating side shortcuts leave the centre of the world and movement controls clear. */
export function ActionDock({ inHome }: { inHome: boolean }) {
  const dungeon = useDungeon((s) => !!s.data?.instance);
  const mountain = useGame((s) => isMountainPosition(s.playerPos[0], s.playerPos[2]));
  const sheet = useHud((s) => s.sheet);
  const accountId = useAccount((s) => s.user?.id ?? null);
  const hintId = useId();
  const inProlog = useProlog((s) => !!s.data && !s.data.completedAt);
  const eligibleHint =
    !sheet && !inProlog && !dungeon && !inHome
      ? "Bingung cara main? Buka 12 topik Panduan Pemula di sini."
      : null;
  const presentedFor = useRef<string | null>(null);
  const [visibleFor, setVisibleFor] = useState<string | null>(null);
  useEffect(() => {
    if (!accountId || !eligibleHint || presentedFor.current === accountId) return;
    presentedFor.current = accountId;
    if (claimBeginnerGuideTooltip(accountId)) setVisibleFor(accountId);
  }, [accountId, eligibleHint]);
  useEffect(() => {
    if (!visibleFor) return;
    const timer = window.setTimeout(() => setVisibleFor(null), GUIDE_TOOLTIP_DURATION_MS);
    return () => window.clearTimeout(timer);
  }, [visibleFor]);
  const hint = visibleFor === accountId ? eligibleHint : null;
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
    setVisibleFor(null);
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
          data-guide-hint={side === "left" && hint ? true : undefined}
          className={`mmo-side-menu mmo-side-menu-${side}`}
        >
          {side === "left" && inProlog && !dungeon && (
            <>
              <PrologShortcut />
              {!sheet && <StopGuidanceButton />}
            </>
          )}
          {MENUS[side]
            .filter(
              ({ id }) =>
                (!inProlog || (id !== "daily-login" && id !== "quests")) &&
                (!mountain || id !== "explore") &&
                (!inHome || id === "daily-missions" || id === "phone") &&
                (!dungeon || id === "phone" || id === "quests") &&
                (!driving || side === "left" || id === "phone"),
            )
            .map(({ id, label }) =>
              id === "daily-missions" && inProlog ? (
                <DeliveryShortcut key={id} />
              ) : id === "phone" ? (
                <PhoneShortcut key={id} onClick={() => press("phone")} />
              ) : (
                <Fragment key={id}>
                  <button
                    type="button"
                    data-hud-control
                    data-side-action={id}
                    onClick={() => press(id)}
                    aria-label={label}
                    aria-describedby={id === "beginner-guide" && hint ? hintId : undefined}
                    aria-haspopup="dialog"
                    aria-expanded={sheet === id}
                    className={`mmo-side-button ${sheet === id ? "is-active" : ""}`}
                  >
                    {id === "beginner-guide" ? (
                      <img
                        className="mmo-menu-artwork mmo-guide-shortcut-portrait"
                        src="/assets/beginner-guide/koko-cung.webp"
                        alt=""
                        draggable={false}
                      />
                    ) : (
                      <HudMenuArtwork kind={id} />
                    )}
                    {id === "daily-missions" && <MissionDot scope="daily" />}
                    {id === "quests" && <MissionDot scope="quests" />}
                    <span className="mmo-side-label">{label}</span>
                    {id === "beginner-guide" && hint && (
                      <span id={hintId} role="tooltip" className="mmo-guide-hint">
                        {hint}
                      </span>
                    )}
                  </button>
                  {id === "daily-missions" && <DeliveryShortcut />}
                </Fragment>
              ),
            )}
          {side === "right" && !dungeon && !sheet && !driving && !inHome && <SpawnButton />}
          {side === "left" && !inProlog && !dungeon && !sheet && <StopGuidanceButton />}
        </nav>
      ))}
    </div>
  );
}
