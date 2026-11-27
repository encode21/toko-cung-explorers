import { useClub } from "@/game/club/store";
import { useDungeon } from "@/game/dungeon/store";
import { useGang } from "@/game/gang/store";
import { mapDestination, type WaypointId } from "@/game/navigation/map-destinations";
import { ojekTarget, useOjek } from "@/game/ojek/store";
import { useUsaha } from "@/game/usaha/store";
import { useWarung } from "@/game/warung/store";
import { useGame } from "@/state/game-store";
import { useHud, type HudSheet } from "@/state/hud-store";
import type { StorySection } from "./types";

export interface GuideAction {
  label: string;
  help: string;
  waypoint?: WaypointId;
  /** Also the fallback when a physical destination is no longer available. */
  sheet?: Exclude<HudSheet, null>;
}

const APP_LABELS: Partial<Record<Exclude<HudSheet, null>, string>> = {
  ojek: "Buka Ojek",
  warung: "Buka Warungku",
  usaha: "Buka Usaha",
  "warung-community": "Buka Komunitas",
  tokocung: "Buka Toko Cung",
};

function app(sheet: Exclude<HudSheet, null>, help: string): GuideAction {
  return { label: APP_LABELS[sheet] ?? "Buka aplikasi", help, sheet };
}

/** World waypoints cannot guide between separate interiors or active dungeon instances. */
function exitHelp(): string | null {
  if (useDungeon.getState().data?.instance)
    return "Keluar dari dungeon untuk mengikuti petunjuk di kota.";
  const club = useClub.getState();
  if (club.inside && !club.outdoor) return "Keluar dari klub untuk mengikuti petunjuk di kota.";
  if (useWarung.getState().inside) return "Keluar dari warung untuk mengikuti petunjuk di kota.";
  if (useUsaha.getState().inside)
    return "Keluar dari bangunan usaha untuk mengikuti petunjuk di kota.";
  if (useGang.getState().inside !== null)
    return "Kembali ke kota melalui pintu keluar kampung untuk mengikuti petunjuk.";
  return null;
}

function destination(
  waypoint: WaypointId,
  sheet: Exclude<HudSheet, null>,
  help: string,
): GuideAction {
  const blocked = exitHelp();
  if (blocked) return app(sheet, `${help} ${blocked}`);
  if (!mapDestination(waypoint))
    return app(sheet, `${help} Lokasinya belum tersedia; lanjutkan melalui aplikasi.`);
  return { label: "Tunjukkan jalan", help, waypoint, sheet };
}

/** Uses the existing ojek resolver, including player passengers currently aboard the bike. */
function currentOjekWaypoint(): "ojek-pickup" | "ojek-dropoff" | null {
  const data = useOjek.getState().data?.ojek;
  const active = data?.job ?? data?.order;
  const target = ojekTarget();
  if (!active || !target) return null;
  return target === active.dropoff ? "ojek-dropoff" : "ojek-pickup";
}

/** Selecting a card only reads its action. Navigation starts after the NPC explanation. */
export function resolveGuideAction(section: StorySection): GuideAction | null {
  const page = section.current;
  if (!page) return null;
  if (page.needsWarung) return app("warung", "Buka Warungku untuk mulai mengelola warung teras.");
  if (page.progress.claimInWarung)
    return app(
      "warung",
      "Tujuan bab sudah tercapai. Ambil hasilnya di Warungku, lalu kembali ke Buku Mbah.",
    );

  const type = page.progress.type;
  if (section.id === "jalanan") {
    if (type === "owns") return app("ojek", "Pilih motor sendiri di aplikasi Ojek.");
    if (["ojek_trips", "ojek_destinations", "ojek_streak", "ojek_rating"].includes(type)) {
      const waypoint = currentOjekWaypoint();
      return waypoint
        ? destination(
            waypoint,
            "ojek",
            "Ikuti petunjuk menuju lokasi order ojek yang sedang berjalan.",
          )
        : app("ojek", "Aktifkan driver di aplikasi Ojek, lalu terima dan selesaikan order.");
    }
  }
  if (section.id === "dagang") {
    if (type === "journal")
      return app(
        "warung-community",
        "Pilih warung pemain lain di Komunitas, lalu kunjungi dan beli stoknya.",
      );
    if (["warung_story", "warung_level", "employees"].includes(type)) {
      const { data, inside } = useWarung.getState();
      if (!data?.warung || inside?.id === data.warung.id)
        return app("warung", "Lanjutkan tujuan bab dan kelola usaha melalui Warungku.");
      return destination(
        "usaha-warung",
        "warung",
        "Kembali ke warungmu untuk melanjutkan tujuan bab ini.",
      );
    }
  }
  if (section.id === "dapur" && ["owns", "journal", "days_without_basi"].includes(type)) {
    // The server's Dapur page 1 is the grocery visit; journal conditions are not sent to clients.
    if (section.page === 1 && type === "journal")
      return destination("map-store", "usaha", "Kunjungi Toko Cung untuk belanja bahan warteg.");
    if (useUsaha.getState().inside === "warteg")
      return app("usaha", "Kelola wartegmu untuk melanjutkan tujuan dapur ini.");
    return destination(
      "usaha-warteg",
      "usaha",
      "Datangi warteg melalui pintu depannya untuk melanjutkan tujuan ini.",
    );
  }
  if (section.id === "kos" && ["owns", "journal", "kos_tenants", "kos_full_days"].includes(type)) {
    if (useUsaha.getState().inside === "kos")
      return app("usaha", "Kelola kosmu untuk melanjutkan tujuan ini.");
    return destination(
      "usaha-kos",
      "usaha",
      "Datangi kos-kosan melalui pintu depannya untuk melanjutkan tujuan ini.",
    );
  }
  return null;
}

/** Called only by the explanation's final action, never during card selection or rendering. */
export function startGuideAction(action: GuideAction): void {
  let waypoint = action.waypoint;
  if (waypoint === "ojek-pickup" || waypoint === "ojek-dropoff")
    waypoint = currentOjekWaypoint() ?? undefined;
  if (waypoint && !exitHelp() && mapDestination(waypoint)) {
    useHud.getState().setSheet(null);
    useGame.getState().setWaypoint(waypoint);
    return;
  }
  if (action.sheet) useHud.getState().setSheet(action.sheet);
}
