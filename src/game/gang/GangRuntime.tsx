import { HomePrivacy } from "./HomePrivacy";
import { GangDirectory } from "./GangDirectory";
import { useGame } from "@/state/game-store";
import { warungSlotAt } from "@/game/warung/model";
import { useEffect } from "react";
import { useAccount } from "@/auth/useSession";
import { useChannels } from "@/net/channel-store";
import { useWarung } from "@/game/warung/store";
import { GameButton, GameModal } from "@/ui/game-ui/GamePanel";
import { useGang, clearGang, gangCommand, isGangPosition } from "./store";
import { homeAddress, type DecorSlot } from "./model";
import "./gang.css";

export function GangRuntime() {
  const account = useAccount((s) => s.user);
  const data = useGang((s) => s.data);
  const customize = useGang((s) => s.customize);
  const board = useGang((s) => s.board);
  const busy = useGang((s) => s.busy);
  const error = useGang((s) => s.error);
  const retry = useGang((s) => s.retry);
  useEffect(() => {
    clearGang();
    if (!account) return;
    const refresh = () => {
      if (document.visibilityState !== "visible") return;
      const gang = useGang.getState().inside;
      void gangCommand("read", gang ? { gang } : {});
    };
    refresh();
    const stop = useWarung.subscribe((s, before) => {
      if (s.data !== before.data) refresh();
    });
    const channelStop = useChannels.subscribe((s, before) => {
      if (s.playing !== before.playing && !s.playing) clearGang();
      else if (s.playing !== before.playing) refresh();
    });
    const teleportStop = useGame.subscribe((s, before) => {
      const p = s.pendingTeleport;
      if (
        p &&
        p !== before.pendingTeleport &&
        useGang.getState().inside &&
        !isGangPosition(p[0], p[2]) &&
        warungSlotAt(p[0], p[2]) < 0
      ) {
        useGang.setState({ inside: null, customize: false });
      }
    });
    const interval = window.setInterval(refresh, 30000);
    window.addEventListener("focus", refresh);
    return () => {
      stop();
      channelStop();
      teleportStop();
      window.clearInterval(interval);
      window.removeEventListener("focus", refresh);
      clearGang();
    };
  }, [account]);
  if (!data) return null;
  if (board) return <GangDirectory data={data} />;
  if (!customize) return null;
  const home = data.houses.find((h) => h.mine);
  return (
    <GameModal
      title={data.text["customize"]!}
      subtitle={homeAddress(data)}
      onClose={() => useGang.setState({ customize: false })}
    >
      <div className="gang-decor">
        <HomePrivacy />
        <p>{data.text["free_decor"]}</p>
        {(Object.keys(data.catalog) as DecorSlot[]).map((slot) => (
          <div className="gang-decor-options" key={slot}>
            {data.catalog[slot].map((item) => (
              <GameButton
                key={item.id}
                disabled={busy || !!retry}
                aria-pressed={home?.style[slot].id === item.id}
                onClick={() => void gangCommand("decorate", { slot, itemId: item.id })}
              >
                <i style={{ background: item.color }} />
                {item.name}
              </GameButton>
            ))}
          </div>
        ))}
        {error && <p role="alert">{error}</p>}
        {retry && (
          <GameButton disabled={busy} onClick={() => void gangCommand(retry.action, retry)}>
            {data.text["retry"]}
          </GameButton>
        )}
      </div>
    </GameModal>
  );
}
