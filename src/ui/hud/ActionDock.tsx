import { Compass, House, Map, MessageCircle, Flag, UserRound } from "lucide-react";
import { useGame } from "@/state/game-store";
import { useHud, type HudSheet } from "@/state/hud-store";
import { useNet } from "@/net/net-store";
import { useMobileHudLayout } from "@/hooks/use-mobile-hud";

const ITEMS: {
  id: Exclude<HudSheet, null> | "home" | "quests";
  label: string;
  Icon: typeof House;
}[] = [
  { id: "home", label: "Home", Icon: House },
  { id: "map", label: "Peta", Icon: Map },
  { id: "explore", label: "Jelajah", Icon: Compass },
  { id: "quests", label: "Quest", Icon: Flag },
  { id: "chat", label: "Chat", Icon: MessageCircle },
  { id: "profile", label: "Profil", Icon: UserRound },
];

/** Dock aksi bawah: Home / Peta / Jelajah / Quest / Chat / Profil. */
export function ActionDock() {
  const sheet = useHud((s) => s.sheet);
  const toggle = useHud((s) => s.toggleSheet);
  const setSheet = useHud((s) => s.setSheet);
  const openKiosk = useGame((s) => s.openKiosk);
  const setWaypoint = useGame((s) => s.setWaypoint);
  const unread = useNet((s) => s.unread);
  const { mobile } = useMobileHudLayout();

  const press = (id: (typeof ITEMS)[number]["id"]) => {
    if (id === "home") {
      setSheet(null);
      setWaypoint(null);
    } else if (id === "quests") {
      setSheet(null);
      openKiosk();
    } else toggle(id);
  };

  return (
    <nav
      aria-label="Dock aksi"
      data-world-dock
      data-hud-control
      className={`-translate-x-1/2 pointer-events-auto absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 flex items-center hud-glass ${
        mobile ? "gap-0 rounded-2xl px-0.5 py-0.5" : "gap-0.5 rounded-2xl p-1"
      }`}
    >
      {ITEMS.map(({ id, label, Icon }) => {
        const active = sheet === id || (id === "home" && sheet === null);
        return (
          <button
            key={id}
            type="button"
            onClick={() => press(id)}
            aria-label={label}
            aria-pressed={active}
            className={`relative flex min-h-11 items-center justify-center rounded-xl transition ${
              mobile ? "w-11 flex-col gap-0.5 py-0.5" : "w-12 flex-col gap-0.5 sm:w-16"
            } ${
              active
                ? "bg-world-panel-foreground text-world-accent-foreground"
                : "text-world-panel-foreground hover:bg-world-panel"
            }`}
          >
            <Icon className={mobile ? "size-[1.15rem]" : "size-5"} />
            <span className={`font-semibold ${mobile ? "text-[9px] leading-none" : "text-[10px]"}`}>
              {label}
            </span>
            {id === "chat" && unread > 0 && sheet !== "chat" && (
              <span className="absolute top-1 right-1.5 size-2 rounded-full bg-world-brand" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
