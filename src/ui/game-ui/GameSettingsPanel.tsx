import { GameDropdown } from "./GamePrimitives";
import { useGameSettings, type GraphicsQuality } from "@/state/game-settings";
import { FullscreenController } from "./FullscreenController";

export function GameSettingsPanel() {
  const s = useGameSettings();
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <label className="grid gap-1">
        Kualitas grafis
        <GameDropdown
          className="game-button bg-slate-900"
          value={s.graphics}
          onValueChange={(value) => s.update({ graphics: value as GraphicsQuality })}
        >
          {["AUTO", "LOW", "MEDIUM", "HIGH"].map((q) => (
            <option key={q}>{q}</option>
          ))}
        </GameDropdown>
      </label>
      <label className="grid gap-1">
        Ukuran UI
        <GameDropdown
          className="game-button bg-slate-900"
          value={s.uiSize}
          onValueChange={(value) => s.update({ uiSize: value as "compact" | "comfortable" })}
        >
          <option value="compact">Ringkas</option>
          <option value="comfortable">Nyaman</option>
        </GameDropdown>
      </label>
      <label className="grid gap-1">
        Sensitivitas kamera · {s.cameraSensitivity.toFixed(1)}×
        <input
          aria-label="Sensitivitas kamera"
          type="range"
          min="0.4"
          max="2"
          step="0.1"
          value={s.cameraSensitivity}
          onChange={(e) => s.update({ cameraSensitivity: +e.target.value })}
        />
      </label>
      <label className="grid gap-1">
        Sensitivitas analog · {s.joystickSensitivity.toFixed(1)}×
        <input
          aria-label="Sensitivitas analog"
          type="range"
          min="0.5"
          max="1.5"
          step="0.1"
          value={s.joystickSensitivity}
          onChange={(e) => s.update({ joystickSensitivity: +e.target.value })}
        />
      </label>
      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          checked={s.showQuest}
          onChange={(e) => s.update({ showQuest: e.target.checked })}
        />
        Tampilkan tracker quest
      </label>
      <label className="flex min-h-11 items-center gap-2">
        <input
          type="checkbox"
          checked={s.diagnostics}
          onChange={(e) => s.update({ diagnostics: e.target.checked })}
        />
        Diagnostik performa
      </label>
      <FullscreenController />
      <p className="text-xs text-world-muted">
        AUTO menyesuaikan resolusi dan bayangan. Suara & musik tersedia di Pengaturan.
      </p>
    </div>
  );
}
