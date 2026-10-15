import { BookMarked, Settings, HelpCircle, UserRound, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useHud } from "@/state/hud-store";

/** Essential utilities stay visible; secondary destinations live in the menu. */
export function GameMenu() {
  const toggle = useHud((s) => s.toggleSheet);
  const [menu, setMenu] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menu) return;
    const onPointer = (e: PointerEvent) => {
      if (
        !root.current?.contains(e.target as Node) &&
        !(e.target instanceof Element && e.target.closest("[data-game-panel]"))
      ) {
        setMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenu(false);
      }
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [menu]);

  return (
    <div ref={root} data-hud-control data-game-menu className="mmo-game-menu">
      <button
        type="button"
        aria-label={menu ? "Tutup pengaturan" : "Buka pengaturan"}
        aria-expanded={menu}
        aria-controls="game-utility-menu"
        onClick={() => setMenu((v) => !v)}
        className={`mmo-actionbar-button ${menu ? "is-active" : ""}`}
      >
        {menu ? <X aria-hidden /> : <Settings aria-hidden />}
        <span className="mmo-actionbar-label">Pengaturan</span>
      </button>
      {menu && (
        <div id="game-utility-menu" className="mmo-menu" aria-label="Pengaturan">
          {[
            { id: "settings" as const, label: "Pengaturan game", Icon: Settings },
            { id: "profile" as const, label: "Karakter & Point", Icon: UserRound },
            { id: "archive" as const, label: "Arsip rahasia", Icon: BookMarked },
            { id: "help" as const, label: "Panduan kontrol", Icon: HelpCircle },
          ].map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-xs hover:bg-white/10"
              onClick={() => {
                toggle(id);
                setMenu(false);
              }}
            >
              <Icon className="size-4 text-amber-200" />
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
