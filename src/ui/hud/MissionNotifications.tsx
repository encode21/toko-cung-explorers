import { useGame } from "@/state/game-store";
import { useEffect } from "react";
import { useProfile } from "@/identity/profile-store";
import { useDaily } from "@/game/daily/store";
import { useGameCore } from "@/game/core/store";
import { useDungeon } from "@/game/dungeon/store";
import { useMissions } from "@/game/missions/store";
import { useFishing } from "@/game/fishing/store";
import { useHud } from "@/state/hud-store";
import {
  markNoticesRead,
  updateNotices,
  useMissionNotices,
  type NoticeScope,
} from "@/state/mission-notifications";
export function MissionNotifications() {
  const account = useProfile((s) => s.profile?.id);
  const daily = useDaily((s) => s.data),
    core = useGameCore((s) => s.snapshot),
    dungeon = useDungeon((s) => s.data?.instance),
    missions = useMissions(),
    fishing = useFishing((s) => s.data);
  const sheet = useHud((s) => s.sheet);
  const overlay = useGame((s) => s.overlay);
  const dailyKey = JSON.stringify(
    daily
      ? [
          `set:${daily.setId}`,
          ...daily.quests.filter((q) => q.receipt).map((q) => `receipt:${q.id}`),
        ]
      : [],
  );
  const questKey = JSON.stringify([
    ...(core?.quests.filter((q) => q.available).map((q) => `available:${q.id}`) ?? []),
    ...(core?.active ? [`run:${core.active.id}:${core.active.status}`] : []),
    ...(core?.history.map((q) => `history:${q.id}`) ?? []),
    ...(dungeon ? [`dungeon:${dungeon.id}:${dungeon.status}`] : []),
    ...(missions.session.active
      ? [`mission:${missions.session.active.id}:${missions.session.active.status}`]
      : []),
    ...missions.available.map((o) => `offer:${o.sourceEventId}`),
    ...(missions.session.last
      ? [`mission:${missions.session.last.id}:${missions.session.last.status}`]
      : []),
  ]);
  const inventoryKey = JSON.stringify(
    fishing?.collection.map((f) => `fish:${f.fishId}:${f.count}`) ?? null,
  );
  useEffect(() => {
    updateNotices(account ?? "", {
      daily: account ? JSON.parse(dailyKey) : [],
      quests: account ? JSON.parse(questKey) : [],
      inventory: account ? JSON.parse(inventoryKey) : [],
    });
    if (sheet === "daily-missions") markNoticesRead("daily");
    if (sheet === "quests" || overlay === "kiosk") markNoticesRead("quests");
    if (sheet === "inventory") markNoticesRead("inventory");
  }, [account, dailyKey, questKey, inventoryKey, sheet, overlay]);
  return null;
}
export function MissionDot({ scope }: { scope: NoticeScope }) {
  const unread = useMissionNotices((s) => s.unread[scope]);
  return unread ? (
    <span
      className="quest-notification-dot"
      data-notification-dot={scope}
      role="img"
      aria-label="Ada pembaruan belum dibaca"
    />
  ) : null;
}
