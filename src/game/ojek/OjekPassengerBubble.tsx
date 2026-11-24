import { useEffect, useState } from "react";
import { SpeechBubble } from "@/game/net/PlayerChatBubble";
import { useHud } from "@/state/hud-store";
import { useOjek, type OjekOrder } from "./store";

export function OjekPassengerBubble({ order, aboard }: { order: OjekOrder; aboard: boolean }) {
  const remark = useOjek((s) => s.remark);
  const photo = useHud((s) => s.sheet === "camera");
  const [expired, setExpired] = useState<number | null>(null);
  useEffect(() => {
    if (!remark) return;
    const timer = window.setTimeout(
      () => setExpired(remark.until),
      Math.max(0, remark.until - Date.now()),
    );
    return () => window.clearTimeout(timer);
  }, [remark]);
  if (photo) return null;
  const text =
    remark && remark.until !== expired && remark.until > Date.now()
      ? remark.text
      : `Ke ${order.dropoff.name}`;
  return <SpeechBubble senderId={`ojek-${order.id}`} text={text} height={aboard ? 2.85 : 2.4} />;
}
