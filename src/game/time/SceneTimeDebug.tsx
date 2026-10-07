import { useSceneTime } from "./scene-time";
import { TIME_PRESETS } from "./model";

/** Opt-in dev tools, separate from the game HUD; excluded from production rendering. */
export function SceneTimeDebug() {
  const time = useSceneTime((s) => s.currentTime);
  const mode = useSceneTime((s) => s.mode);
  if (
    !import.meta.env.DEV ||
    typeof window === "undefined" ||
    !new URLSearchParams(window.location.search).has("timeDebug")
  )
    return null;
  return (
    <div
      data-hud-control
      style={{
        position: "fixed",
        bottom: 88,
        left: 12,
        zIndex: 100,
        background: "#182637ee",
        color: "white",
        padding: 12,
        borderRadius: 10,
        font: "12px sans-serif",
        maxWidth: 230,
      }}
    >
      <div style={{ marginBottom: 8 }}>
        WIB {time} · {mode}
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
        {TIME_PRESETS.map((preset) => (
          <button type="button" key={preset} onClick={() => window.sceneTime?.setWorldTime(preset)}>
            {preset}
          </button>
        ))}
        <button type="button" onClick={() => window.sceneTime?.setRealTime()}>
          Live WIB
        </button>
        <button type="button" onClick={() => window.sceneTime?.startDemo()}>
          Demo 8 min
        </button>
      </div>
    </div>
  );
}
