import { GameModal } from "@/ui/game-ui/GamePanel";
import { BookMarked, Settings, HelpCircle, UserRound, Volume2, VolumeX, X } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useAudioSettings } from "@/game/audio/audio-manager";
import { useMusic } from "@/game/audio/music-store";
import { useHud } from "@/state/hud-store";

function VolumeSlider({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (v: number) => void;
}) {
  const pct = Math.round(value * 100);
  return (
    <label htmlFor={id} className="block space-y-1.5">
      <span className="flex items-center justify-between text-[11px] text-world-muted">
        <span>{label}</span>
        <span className="tabular-nums text-world-panel-foreground">{pct}%</span>
      </span>
      <input
        id={id}
        type="range"
        min={0}
        max={100}
        step={1}
        value={pct}
        onChange={(e) => onChange(Number(e.target.value) / 100)}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-world-outline accent-world-brand [&::-webkit-slider-thumb]:size-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-world-brand"
      />
    </label>
  );
}

/** Essential utilities stay visible; secondary destinations live in the menu. */
export function GameMenu() {
  const toggle = useHud((s) => s.toggleSheet);
  const bgmVolume = useMusic((s) => s.bgmVolume);
  const sfxVolume = useMusic((s) => s.sfxVolume);
  const setBgmVolume = useMusic((s) => s.setBgmVolume);
  const setSfxVolume = useMusic((s) => s.setSfxVolume);
  const ensureStarted = useMusic((s) => s.ensureStarted);
  const audio = useAudioSettings();
  const volumeId = useId();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const bgmId = useId();
  const sfxId = useId();
  const silent = audio.muted || audio.master <= 0.001;

  useEffect(() => {
    if (!open && !menu) return;
    const onPointer = (e: PointerEvent) => {
      if (
        !root.current?.contains(e.target as Node) &&
        !(e.target instanceof Element && e.target.closest("[data-game-panel]"))
      ) {
        setOpen(false);
        setMenu(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        setMenu(false);
      }
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, menu]);

  return (
    <div ref={root} data-hud-control data-game-menu className="mmo-game-menu">
      <div>
        {open && (
          <GameModal title="Pengaturan audio" onClose={() => setOpen(false)}>
            <div className="flex items-center justify-between">
              <button
                type="button"
                aria-label="Kembali ke pengaturan"
                className="min-h-11 text-xs"
                onClick={() => {
                  setOpen(false);
                  setMenu(true);
                }}
              >
                ← Pengaturan
              </button>
              <button
                type="button"
                aria-pressed={audio.muted}
                onClick={audio.toggleMuted}
                className="min-h-11 rounded-lg px-2 text-xs active:scale-95"
              >
                {audio.muted ? "Aktifkan suara" : "Bisukan semua"}
              </button>
            </div>
            <VolumeSlider
              id={`${volumeId}-master`}
              label="Volume utama"
              value={audio.master}
              onChange={(v) => audio.setVolume("master", v)}
            />
            <VolumeSlider
              id={`${volumeId}-ambience`}
              label="Suasana dunia"
              value={audio.ambience}
              onChange={(v) => audio.setVolume("ambience", v)}
            />
            <VolumeSlider
              id={`${volumeId}-vehicle`}
              label="Kendaraan"
              value={audio.vehicle}
              onChange={(v) => audio.setVolume("vehicle", v)}
            />
            <VolumeSlider
              id={bgmId}
              label="Musik (BGM)"
              value={bgmVolume}
              onChange={setBgmVolume}
            />
            <VolumeSlider id={sfxId} label="Efek (SFX)" value={sfxVolume} onChange={setSfxVolume} />
          </GameModal>
        )}
      </div>
      <button
        type="button"
        aria-label={menu ? "Tutup pengaturan" : "Buka pengaturan"}
        aria-expanded={menu}
        aria-controls="game-utility-menu"
        onClick={() => {
          setMenu((v) => !v);
          setOpen(false);
        }}
        className={`mmo-actionbar-button ${menu || open ? "is-active" : ""}`}
      >
        {menu ? <X className="size-3.5" /> : <Settings className="size-3.5" />}
        <span className="font-semibold text-[10px] leading-none">Pengaturan</span>
      </button>
      {menu && (
        <div id="game-utility-menu" className="mmo-menu" aria-label="Pengaturan">
          <button
            type="button"
            aria-label="Atur volume musik & efek"
            className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-left text-xs hover:bg-white/10"
            onClick={() => {
              setOpen(true);
              setMenu(false);
              void ensureStarted();
            }}
          >
            {silent ? (
              <VolumeX className="size-4 text-amber-200" />
            ) : (
              <Volume2 className="size-4 text-amber-200" />
            )}
            Suara & musik
          </button>
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
