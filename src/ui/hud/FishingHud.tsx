import { useEffect, useRef } from "react";
import { Settings } from "lucide-react";
import { closeFishing, fishingAction, useFishing } from "@/game/fishing/store";
import { useFishingPhase } from "@/game/fishing/use-fishing-phase";
import { useHud } from "@/state/hud-store";
import { useGame } from "@/state/game-store";
import { useGameUi } from "@/state/game-ui-store";
import { useObby } from "@/game/obby/store";
import { OBBY_PLATFORMS } from "@/game/obby/model";
import { useTouchControls } from "@/hooks/use-touch";
import "./context-actions.css";

export function FishingHud() {
  const state = useFishing(),
    { now, phase } = useFishingPhase(),
    touch = useTouchControls();
  const obby = useObby();
  const sheet = useHud((s) => s.sheet),
    overlay = useGame((s) => s.overlay),
    blocked = useGameUi((s) => s.panels > 0 || s.portrait);
  const lastBite = useRef("");
  useEffect(() => {
    if (!state.open) return;
    const escape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !useHud.getState().sheet) closeFishing();
    };
    window.addEventListener("keydown", escape);
    return () => window.removeEventListener("keydown", escape);
  }, [state.open]);
  useEffect(() => {
    if (state.open && phase === "bite" && state.data?.cast?.id !== lastBite.current) {
      lastBite.current = state.data?.cast?.id ?? "";
      if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches)
        navigator.vibrate?.([80, 50, 100]);
    }
  }, [state.open, phase, state.data?.cast?.id]);
  if (sheet || overlay !== "none" || blocked) return null;
  if (!state.open)
    return obby.status === "active" ? (
      <div className="activity-status" data-obby-progress>
        <div className="activity-status-line">
          <span>
            Obby {obby.step}/{OBBY_PLATFORMS.length - 1} · Checkpoint {obby.checkpoint}
          </span>
        </div>
      </div>
    ) : null;
  const caught = state.data?.catch,
    fish = state.data?.fish.find((f) => f.id === caught?.fishId),
    cast = state.data?.cast;
  const message =
    state.error ||
    (state.busy
      ? "Memproses…"
      : phase === "bite"
        ? "Ikan menyambar! Tarik sekarang!"
        : phase === "waiting"
          ? "Menunggu sambaran…"
          : phase === "caught" && fish && caught
            ? `${fish.name} · ${fish.tier} · ${caught.sizeCm.toFixed(1)} cm · Masuk inventory`
            : phase === "missed"
              ? "Ikan lepas · Lempar lagi"
              : "Siap memancing");
  return (
    <div className="activity-status" data-fishing-hud>
      <div className="activity-status-line">
        <span role="status" data-fishing-phase={phase}>
          {message}
        </span>
        <button
          aria-label="Pengaturan memancing"
          onClick={() => {
            useFishing.setState({ browsing: true });
            useHud.getState().setSheet("fishing-settings");
          }}
        >
          <Settings size={18} />
        </button>
        {!touch && (
          <button
            onClick={() => void fishingAction()}
            disabled={state.busy}
            aria-label={
              state.error
                ? "Coba lagi"
                : phase === "bite" || phase === "waiting"
                  ? "Tarik kail"
                  : "Lempar kail"
            }
          >
            {" "}
            {state.error
              ? "Coba lagi"
              : phase === "bite" || phase === "waiting"
                ? "Tarik"
                : "Lempar"}
          </button>
        )}
      </div>
      {phase === "bite" && cast && (
        <progress
          aria-label="Waktu menarik ikan"
          max={cast.expiresAt - cast.biteAt}
          value={Math.max(0, cast.expiresAt - now)}
        />
      )}
    </div>
  );
}
export function FishingSettings() {
  const s = useFishing();
  const { phase } = useFishingPhase();
  useEffect(() => {
    useFishing.setState({ browsing: true });
    return () => useFishing.setState({ browsing: false });
  }, []);
  return (
    <section className="activity-details" aria-label="Pengaturan memancing">
      <p>Gunakan tombol kail atau Spasi. Bergerak untuk berhenti memancing.</p>
      {s.error && <p role="alert">{s.error}</p>}
      <label>
        Pancing{" "}
        <select
          aria-label="Pilih pancing"
          value={s.rodId}
          disabled={s.busy || !!s.pending || ["waiting", "bite"].includes(phase)}
          onChange={(e) => useFishing.setState({ rodId: e.target.value })}
        >
          {s.data?.rods
            .filter((r) => s.data!.ownedRods.includes(r.id))
            .map((r) => (
              <option value={r.id} key={r.id}>
                {r.name}
              </option>
            ))}
        </select>
      </label>
      <button
        onClick={() => {
          closeFishing();
          useHud.getState().setSheet(null);
        }}
      >
        Berhenti memancing
      </button>
      <button
        onClick={() => {
          closeFishing();
          useHud.getState().setSheet("inventory");
        }}
      >
        Koleksi ikan
      </button>
    </section>
  );
}
