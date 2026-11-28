import { useEffect } from "react";
import { useAccount } from "@/auth/useSession";
import { INCIDENT_TITLES } from "@/game/incidents/model";
import { useIncidents } from "@/game/incidents/store";
import { GAME_DAY_MS } from "@/game/time/model";
import { useSceneTime } from "@/game/time/scene-time";
import { dueNotices, hh, noticeKey } from "@/game/town-events/model";
import { loadTownEvents, useTownEvents } from "@/game/town-events/store";
import { useChannels } from "@/net/channel-store";
import { useGame } from "@/state/game-store";
import { recordPhoneWorldNotices } from "./use-phone-notices";

let saleToasted = "";

/** Collect announcements even while the player is indoors or a sheet is open. */
export function PhoneWorldNotices() {
  const accountId = useAccount((s) => s.user?.id);
  const playing = useChannels((s) => s.playing);
  const events = useTownEvents((s) => s.events);
  const hour = useSceneTime((s) => s.hour);
  const incident = useIncidents((s) => s.visible);
  const sale = useTownEvents((s) => s.sale);

  useEffect(() => {
    if (!playing) return;
    void loadTownEvents();
    const timer = window.setInterval(() => void loadTownEvents(), 60_000);
    return () => window.clearInterval(timer);
  }, [playing, accountId]);

  useEffect(() => {
    if (!playing || !accountId) return;
    const day = Math.floor(Date.now() / GAME_DAY_MS);
    const notices = dueNotices(events, hour, day, []).map((e) => ({
      key: `town:${noticeKey(e, day)}`,
      title: e.event.title,
      text: `Jam ${hh(e.event.hours![0])}–${hh(e.event.hours![1])} · Temui ${e.name} untuk ikut.`,
      kind: "town" as const,
    }));
    if (notices.length) recordPhoneWorldNotices(accountId, notices);
  }, [playing, accountId, events, hour]);

  useEffect(() => {
    if (!playing || !accountId || !incident) return;
    recordPhoneWorldNotices(accountId, [
      {
        key: `incident:${incident.id}`,
        title: INCIDENT_TITLES[incident.type],
        text: incident.location,
        kind: "incident",
      },
    ]);
  }, [playing, accountId, incident]);

  useEffect(() => {
    if (!playing || !accountId || !sale?.active) return;
    recordPhoneWorldNotices(accountId, [
      { key: `sale:${sale.date}`, title: sale.title, text: sale.body, kind: "sale" },
    ]);
    // One toast per sale per page load; the inbox notice stays.
    if (saleToasted === sale.date) return;
    saleToasted = sale.date;
    useGame.getState().setToast(`🏷️ ${sale.title} ${sale.body}`);
  }, [playing, accountId, sale]);

  return null;
}
