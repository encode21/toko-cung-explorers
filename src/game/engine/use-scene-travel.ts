import { useLayoutEffect } from "react";
import { useChannels } from "@/net/channel-store";
import { useNet } from "@/net/net-store";
import { useGame } from "@/state/game-store";
import { useClub, clubTeleport } from "@/game/club/store";
import { useDungeon } from "@/game/dungeon/store";
import { useGang, leaveGang } from "@/game/gang/store";
import { useHome } from "@/game/home/store";
import { useUsaha, exitUsaha } from "@/game/usaha/store";
import { useWarung, exitWarung } from "@/game/warung/store";
import { isMountainPosition } from "@/game/mountain/model";
import {
  prepareScene,
  startTravelRuntime,
  stopTravelRuntime,
  useTravelScene,
  useLoader,
  travelRequestPending,
  type TravelPlace,
} from "@/ui/hud/travel-loader";

function currentPlace(): TravelPlace {
  const dungeon = useDungeon.getState();
  const rev = dungeon.sceneRevision;
  function place(location: string, art: TravelPlace["art"], title: string) {
    return { key: `${rev}/${location}`, revision: rev, art, title };
  }
  const instance = dungeon.data?.instance;
  if (instance && instance.realm !== "WORLD")
    return place("dungeon:" + instance.realm, "misi", "Menuju Principal Dungeon");
  if (useClub.getState().inside && !useClub.getState().outdoor)
    return place("club", "klub", "Masuk Cung Underground");
  const shop = useWarung.getState().inside;
  if (shop) return place("warung:" + shop.id, "warung", shop.name);
  const business = useUsaha.getState().inside;
  if (business)
    return place(
      "usaha:" + business,
      "usaha",
      business === "warteg" ? "Masuk warteg" : "Masuk kos",
    );
  if (useHome.getState().inside) return place("home", "rumah", "Masuk rumah");
  const gang = useGang.getState().inside;
  if (gang !== null) return place("gang:" + gang, "gang", "Menuju Gang Kampung");
  const game = useGame.getState(),
    pos = game.pendingTeleport ?? game.playerPos;
  if (isMountainPosition(pos[0], pos[2])) return place("mountain", "gunung", "Menuju Gunung Cung");
  return place("city", "kota", "Menuju kota");
}

export function failWorldEntry() {
  // Returning to entry unmounts the failed boundary and offers the existing retry/channel actions.
  stopTravelRuntime();
  useChannels.setState({ playing: false, sceneReady: false });
  useNet.setState({ connectionError: "Lokasi belum bisa dimuat. Coba masuk kembali." });
}

function recoverLocation() {
  // A failed download must release the input lock. Leave through the existing room exit
  // so its transient state and return position stay consistent with a normal departure.
  const place = currentPlace();
  if (place.art === "kota" || place.art === "misi") {
    failWorldEntry();
    return;
  }
  if (place.art === "warung") exitWarung();
  else if (place.art === "usaha") exitUsaha();
  else if (place.art === "gang") leaveGang();
  else if (place.art === "klub") {
    useClub.setState({ inside: false, outdoor: false });
    clubTeleport(true);
  } else {
    if (useHome.getState().inside) useHome.setState({ inside: false, leaving: false });
    useGame.getState().requestTeleport([0, 0.83, 12]);
  }
  startTravelRuntime(currentPlace());
  useGame.getState().setToast("Lokasi belum bisa dimuat. Silakan coba lagi.");
}

/** Batch changes made by the individual room and teleport stores into a single destination. */
export function useSceneTravel() {
  const mounted = useTravelScene((s) => s.mounted);
  useLayoutEffect(() => {
    let live = true;
    let scheduled = false;
    let directTeleport = false;
    startTravelRuntime(currentPlace());
    function reconcile() {
      if (scheduled || !live) return;
      scheduled = true;
      queueMicrotask(() => {
        scheduled = false;
        if (!live || !useTravelScene.getState().target || travelRequestPending()) return;
        const place = currentPlace();
        if (useTravelScene.getState().target?.key !== place.key || directTeleport) {
          prepareScene(place, () => {
            recoverLocation();
            directTeleport = false;
          });
        }
        directTeleport = false;
      });
    }
    const stops = [
      useChannels.subscribe((s, old) => {
        if (s.lease && !old.lease && !useTravelScene.getState().target)
          startTravelRuntime(currentPlace());
      }),
      useLoader.subscribe((s, old) => {
        if (s.commit !== old.commit) reconcile();
      }),
      useWarung.subscribe((s, old) => {
        if (s.inside?.id !== old.inside?.id) reconcile();
      }),
      useUsaha.subscribe((s, old) => {
        if (s.inside !== old.inside) reconcile();
      }),
      useHome.subscribe((s, old) => {
        if (s.inside !== old.inside) reconcile();
      }),
      useGang.subscribe((s, old) => {
        if (s.inside !== old.inside) reconcile();
      }),
      useClub.subscribe((s, old) => {
        if (s.inside !== old.inside || s.outdoor !== old.outdoor) reconcile();
      }),
      useDungeon.subscribe((s, old) => {
        if (
          s.sceneRevision !== old.sceneRevision ||
          s.data?.instance?.realm !== old.data?.instance?.realm
        )
          reconcile();
      }),
      useGame.subscribe((s, old) => {
        const next = s.pendingTeleport ?? s.playerPos,
          before = old.pendingTeleport ?? old.playerPos;
        if (s.pendingTeleport && s.pendingTeleport !== old.pendingTeleport) {
          // Fast travel within a region reuses its mounted geometry. Short ground corrections
          // (steps, dismounts) are part of normal movement and do not interrupt play.
          if (Math.hypot(next[0] - before[0], next[1] - before[1], next[2] - before[2]) >= 12)
            directTeleport = true;
          reconcile();
        } else if (
          isMountainPosition(next[0], next[2]) !== isMountainPosition(before[0], before[2])
        ) {
          reconcile();
        }
      }),
    ];
    return () => {
      live = false;
      stops.forEach((stop) => stop());
      stopTravelRuntime();
    };
  }, []);
  return mounted;
}
