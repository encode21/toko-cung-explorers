import { Compass, House, Map, MessageCircle, ShoppingBag, UserRound } from "lucide-react";
import { useGame } from "@/state/game-store";
import { useHud, type HudSheet } from "@/state/hud-store";
import { useNet } from "@/net/net-store";

const ITEMS: {
  id: Exclude<HudSheet, null> | "home" | "shop";
  label: string;
  Icon: typeof House;
}[] = [
  { id: "home", label: "Home", Icon: House },
  { id: "map", label: "Peta", Icon: Map },
  { id: "explore", label: "Jelajah", Icon: Compass },
  { id: "shop", label: "Belanja", Icon: ShoppingBag },
  { id: "chat", label: "Chat", Icon: MessageCircle },
  { id: "profile", label: "Profil", Icon: UserRound },
];

/** Dock aksi bawah: Home / Peta / Jelajah / Belanja / Chat / Profil. */
export function ActionDock() {
  const sheet = useHud((s) => s.sheet);
  const toggle = useHud((s) => s.toggleSheet);
  const setSheet = useHud((s) => s.setSheet);
  const openPos = useGame((s) => s.openPos);
  const setWaypoint = useGame((s) => s.setWaypoint);
  const unread = useNet((s) => s.unread);

  const press = (id: (typeof ITEMS)[number]["id"]) => {
    if (id === "home") {
      setSheet(null);
      setWaypoint(null);
    } else if (id === "shop") {
      setSheet(null);
      openPos();
    } else toggle(id);
  };

  return (
    <nav
      aria-label="Dock aksi"
      data-world-dock
      data-hud-control
      className="-translate-x-1/2 pointer-events-auto absolute bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-1/2 flex items-center gap-0.5 rounded-2xl p-1 hud-glass"
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
            className={`relative flex min-h-11 w-12 flex-col items-center justify-center gap-0.5 rounded-xl transition sm:w-16 ${
              active
                ? "bg-world-panel-foreground text-world-accent-foreground"
                : "text-world-panel-foreground hover:bg-world-panel"
            }`}
          >
            <Icon className="size-5" />
            <span className="text-[10px] font-semibold">{label}</span>
            {id === "chat" && unread > 0 && sheet !== "chat" && (
              <span className="absolute top-1 right-2 size-2 rounded-full bg-world-brand" />
            )}
          </button>
        );
      })}
    </nav>
  );
}
