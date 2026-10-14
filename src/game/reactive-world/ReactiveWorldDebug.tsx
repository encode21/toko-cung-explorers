import { GameDropdown } from "@/ui/game-ui/GameDropdown";
import { useMissions } from "@/game/missions/store";
import { expireOwnMissionForDebug } from "@/game/missions/runtime";
import { useTouchControls } from "@/hooks/use-touch";
import { useState } from "react";
import { useReactiveWorld } from "./store";
import { EVENT_TYPES, type EventType, type WorldEvent } from "./model";
import { activate, deactivate, reset, startDemo, demoState } from "./mock";
import { worldDiagnostics } from "./runtime";
export function ReactiveWorldDebug() {
  const state = useReactiveWorld();
  const mission = useMissions();
  const touch = useTouchControls();
  const [notice, setNotice] = useState("");
  const [type, setType] = useState<EventType>("STORE_RUSH");
  const [intensity, setIntensity] = useState(0.7);
  const [tier, setTier] = useState<NonNullable<WorldEvent["payload"]["parcelTier"]>>("MEDIUM");
  const [courier, setCourier] = useState<NonNullable<WorldEvent["payload"]["courier"]>>("JNE");
  if (
    !import.meta.env.DEV ||
    typeof window === "undefined" ||
    !new URLSearchParams(window.location.search).has("worldDebug")
  )
    return null;
  const disabled = !state.host || state.source !== "MOCK";
  const demo = demoState();
  const elapsed = demo.demoAt ? (Date.now() - demo.demoAt) / 1000 : 0;
  const next = [30, 90, 150, 240].find((t) => t > elapsed);
  const nextName =
    next === 30
      ? "STORE_RUSH"
      : next === 90
        ? "WAREHOUSE_RUSH"
        : next === 150
          ? "COURIER_PICKUP"
          : "NORMAL";
  return (
    <details
      data-hud-control
      style={{
        position: "fixed",
        right: 12,
        top:
          touch && (mission.session.active || mission.available.length) ? "min(290px, 35dvh)" : 100,
        maxHeight: touch ? "max(80px, calc(65dvh - 100px))" : "calc(100dvh - 150px)",
        overflowY: "auto",
        zIndex: 100,
        background: "#182637ee",
        color: "white",
        padding: 12,
        borderRadius: 10,
        font: "12px sans-serif",
        maxWidth: 270,
      }}
    >
      <summary>
        Reactive World · {state.source} · {state.host ? "Host" : "Follower"}
      </summary>
      <div>
        Revision {state.snapshot?.revision ?? 0} · {state.events.length} events
      </div>
      <div role="status" style={{ margin: "8px 0", lineHeight: 1.5 }}>
        {state.events.length ? (
          state.events.map((e) => (
            <div key={e.id}>
              {e.type} · {e.status} · {Math.round(e.intensity * 100)}%
            </div>
          ))
        ) : (
          <div>NORMAL — belum ada event aktif</div>
        )}
        <div>
          Pelanggan tambahan: {state.customers} · Pekerja tambahan: {state.workers}
        </div>
        {state.events.some((e) => e.type === "STORE_RUSH") && state.customers === 0 && (
          <div>Mencari lokasi masuk yang tidak terlihat kamera…</div>
        )}
        {!!demo.demoAt && next && (
          <div>
            Demo: {nextName} dalam {Math.ceil(next - elapsed)} detik
          </div>
        )}
        <div>{notice ? `Aksi terakhir: ${notice}` : "Pilih event, lalu klik Aktifkan."}</div>
        {state.error && <div>{state.error}</div>}
      </div>
      <fieldset disabled={disabled} style={{ display: "grid", gap: 8 }}>
        <label>
          Event{" "}
          <GameDropdown value={type} onValueChange={(value) => setType(value as EventType)}>
            {EVENT_TYPES.map((t) => (
              <option key={t}>{t}</option>
            ))}
          </GameDropdown>
        </label>
        <label>
          Intensity {intensity.toFixed(2)}{" "}
          <input
            aria-label="Intensity"
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            value={intensity}
            onChange={(e) => setIntensity(Number(e.target.value))}
          />
        </label>
        <label>
          Parcels{" "}
          <GameDropdown value={tier} onValueChange={(value) => setTier(value as typeof tier)}>
            {["LOW", "MEDIUM", "HIGH"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </GameDropdown>
        </label>
        <label>
          Courier{" "}
          <GameDropdown
            value={courier}
            onValueChange={(value) => setCourier(value as typeof courier)}
          >
            {["JNE", "GoSend", "Deliveree"].map((t) => (
              <option key={t}>{t}</option>
            ))}
          </GameDropdown>
        </label>
        <button onClick={() => setNotice(activate(type, intensity, { parcelTier: tier, courier }))}>
          Aktifkan / perbarui {type}
        </button>
        <button onClick={() => deactivate(type)}>Deactivate (minimum 60s)</button>
        <button
          onClick={() => {
            reset();
            setNotice("Kembali ke NORMAL; NPC menyelesaikan kunjungan.");
          }}
        >
          Force NORMAL
        </button>
        <button
          onClick={() => {
            startDemo();
            setNotice("Demo dimulai NORMAL. Store Rush aktif pada detik 30.");
          }}
        >
          Demo bertahap · 4 menit
        </button>
      </fieldset>
      {mission.session.active && (
        <button disabled={!state.host} onClick={expireOwnMissionForDebug}>
          Dev: expire misi sendiri
        </button>
      )}
      <div>Kontribusi sesi: {mission.session.contribution}</div>
      <button onClick={() => console.info("Reactive World", worldDiagnostics())}>
        Inspect state
      </button>
    </details>
  );
}
