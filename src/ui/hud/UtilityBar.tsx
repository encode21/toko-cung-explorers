import { Bell, ShoppingBag, UserRound, Volume2, VolumeX, Wallet } from "lucide-react";
import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { formatIdr } from "@/commerce/products/catalog";
import { useMusic } from "@/game/audio/music-store";
import { cartCount, cartTotal, useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";

function IconButton({
  label,
  onClick,
  badge,
  disabled,
  children,
}: {
  label: string;
  onClick?: () => void;
  badge?: number;
  disabled?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="relative grid size-11 place-items-center rounded-full text-world-panel-foreground transition hover:bg-world-panel disabled:opacity-40"
    >
      {children}
      {!!badge && (
        <span className="absolute top-1 right-1 grid min-w-4 place-items-center rounded-full bg-world-brand px-1 font-bold text-[10px] text-world-brand-foreground leading-4">
          {badge > 9 ? "9+" : badge}
        </span>
      )}
    </button>
  );
}

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

/** Ikon utilitas kanan atas: audio, keranjang, notifikasi, dompet, profil. */
export function UtilityBar() {
  const cart = useGame((s) => s.cart);
  const openPos = useGame((s) => s.openPos);
  const unseen = useHud((s) => s.unseen);
  const toggle = useHud((s) => s.toggleSheet);
  const bgmVolume = useMusic((s) => s.bgmVolume);
  const sfxVolume = useMusic((s) => s.sfxVolume);
  const setBgmVolume = useMusic((s) => s.setBgmVolume);
  const setSfxVolume = useMusic((s) => s.setSfxVolume);
  const ensureStarted = useMusic((s) => s.ensureStarted);
  const count = cartCount(cart);
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const bgmId = useId();
  const sfxId = useId();
  const silent = bgmVolume <= 0.001 && sfxVolume <= 0.001;

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", onPointer);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div data-hud-control className="pointer-events-auto flex items-center gap-0.5 rounded-full p-0.5 hud-glass">
      <div ref={root} className="relative">
        <IconButton
          label="Atur volume musik & efek"
          onClick={() => {
            setOpen((v) => !v);
            void ensureStarted();
          }}
        >
          {silent ? <VolumeX className="size-5" /> : <Volume2 className="size-5" />}
        </IconButton>
        {open && (
          <div
            role="dialog"
            aria-label="Pengaturan audio"
            className="absolute top-[calc(100%+0.5rem)] right-0 z-30 w-56 space-y-3 rounded-2xl p-3 hud-glass animate-in fade-in zoom-in-95"
          >
            <p className="font-display text-sm tracking-wide">AUDIO</p>
            <VolumeSlider id={bgmId} label="Musik (BGM)" value={bgmVolume} onChange={setBgmVolume} />
            <VolumeSlider id={sfxId} label="Efek (SFX)" value={sfxVolume} onChange={setSfxVolume} />
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={openPos}
        aria-label="Keranjang"
        className="flex min-h-11 items-center gap-2 rounded-full px-3 text-world-panel-foreground transition hover:bg-world-panel"
      >
        <ShoppingBag className="size-5" />
        {count > 0 ? (
          <span className="font-display text-base tracking-wide">
            {count} · <span className="hidden sm:inline">{formatIdr(cartTotal(cart))}</span>
            <span className="sm:hidden">item</span>
          </span>
        ) : (
          <span className="hidden text-xs text-world-muted sm:inline">Kosong</span>
        )}
      </button>
      <IconButton label="Notifikasi" badge={unseen} onClick={() => toggle("feed")}>
        <Bell className="size-5" />
      </IconButton>
      <span className="hidden sm:block">
        <IconButton label="Dompet (segera hadir)" disabled>
          <Wallet className="size-5" />
        </IconButton>
      </span>
      <IconButton label="Profil" onClick={() => toggle("profile")}>
        <UserRound className="size-5" />
      </IconButton>
    </div>
  );
}
