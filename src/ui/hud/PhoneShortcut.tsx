import { useEffect, useId, useState } from "react";
import { useProlog } from "@/game/prolog/store";
import { useHud } from "@/state/hud-store";
import { HudMenuArtwork } from "./HudMenuArtwork";
import { MissionDot } from "./MissionNotifications";
import { usePhoneNotices } from "./use-phone-notices";

const HINT_MS = 4000;
// Both HUDs announce the same inbox. Crossing a doorway must not ring the phone again.
const announcedByAccount = new Map<string, Set<string>>();

export function PhoneShortcut({
  insideWarung = false,
  onClick,
}: {
  insideWarung?: boolean;
  onClick: () => void;
}) {
  const sheet = useHud((s) => s.sheet);
  const unreadProlog = useProlog(
    (s) =>
      s.data?.version === 2 && s.data.step === "phone" && !s.data.completedAt && !s.phoneOpened,
  );
  const { accountKey, unreadKeys } = usePhoneNotices();
  const hintId = useId();
  const [hint, setHint] = useState<{ account: string; key: string } | null>(null);
  const unread = unreadKeys.length > 0;
  const showing = !sheet && hint?.account === accountKey && unreadKeys.includes(hint.key);

  useEffect(() => {
    const announced = announcedByAccount.get(accountKey) ?? new Set<string>();
    for (const key of announced) if (!unreadKeys.includes(key)) announced.delete(key);
    if (sheet || !unreadKeys.length) {
      setHint(null);
      return;
    }
    const firstNew = unreadKeys.find((key) => !announced.has(key));
    if (!firstNew) return;
    for (const key of unreadKeys) announced.add(key);
    announcedByAccount.set(accountKey, announced);
    setHint({ account: accountKey, key: firstNew });
  }, [sheet, accountKey, unreadKeys]);

  useEffect(() => {
    if (!hint) return;
    const timer = window.setTimeout(() => setHint(null), HINT_MS);
    return () => window.clearTimeout(timer);
  }, [hint]);

  return (
    <button
      type="button"
      className={`mmo-side-button${insideWarung ? " warung-toolbar-button" : ""}${sheet === "phone" ? " is-active" : ""}`}
      data-hud-control
      data-side-action="phone"
      data-warung-phone={insideWarung || undefined}
      aria-label="Handphone"
      aria-haspopup="dialog"
      aria-expanded={sheet === "phone"}
      aria-describedby={unread ? hintId : undefined}
      onClick={onClick}
    >
      <span
        className="phone-shortcut-cue"
        data-nudge={showing || undefined}
        data-prolog-ringing={(!insideWarung && !sheet && unreadProlog) || undefined}
      >
        <HudMenuArtwork kind="phone" key={showing ? hint.key : "phone"} />
        {unread ? (
          <>
            <span className="quest-notification-dot" data-phone-inbox-dot aria-hidden="true" />
            <span
              id={hintId}
              role={showing ? "tooltip" : undefined}
              className={showing ? "phone-shortcut-hint" : "sr-only"}
            >
              Notifikasi baru
            </span>
          </>
        ) : (
          !insideWarung && <MissionDot scope="inventory" />
        )}
      </span>
      <span className="mmo-side-label">Handphone</span>
    </button>
  );
}
