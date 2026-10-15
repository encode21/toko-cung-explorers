import { useRef, useState } from "react";
import { useAudioSettings } from "@/game/audio/audio-manager";
import { useMusic } from "@/game/audio/music-store";
import { useProfile } from "@/identity/profile-store";
import { useGameSettings, type GraphicsQuality } from "@/state/game-settings";
import { useHud } from "@/state/hud-store";
import { FullscreenController } from "./FullscreenController";
import "./game-settings.css";

const QUALITY_OPTIONS: { value: GraphicsQuality; label: string }[] = [
  { value: "AUTO", label: "Otomatis" },
  { value: "LOW", label: "Rendah" },
  { value: "MEDIUM", label: "Sedang" },
  { value: "HIGH", label: "Tinggi" },
];
const UI_SIZE_OPTIONS = [
  { value: "compact", label: "Ringkas" },
  { value: "comfortable", label: "Nyaman" },
] as const;

function SettingsSwitch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="settings-row">
      <span>{label}</span>
      <button
        type="button"
        className="settings-switch"
        role="switch"
        aria-label={label}
        aria-checked={checked}
        onClick={onChange}
      >
        <span aria-hidden>{checked ? "On" : "Off"}</span>
        <span className="settings-switch-thumb" aria-hidden />
      </button>
    </div>
  );
}

function VolumeSlider({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: number) => void;
}) {
  const percent = Math.round(value * 100);
  return (
    <label className="settings-slider">
      <span className="settings-slider-label">
        <span>{label}</span>
        <span>{percent}%</span>
      </span>
      <input
        type="range"
        aria-label={label}
        min={0}
        max={100}
        step={1}
        value={percent}
        onChange={(event) => onChange(Number(event.target.value) / 100)}
      />
    </label>
  );
}

function SoundSettings() {
  const audio = useAudioSettings();
  const { bgmVolume, sfxVolume, setBgmVolume, setSfxVolume, ensureStarted } = useMusic();
  const previousBgm = useRef(bgmVolume || 0.7);
  const previousSfx = useRef(sfxVolume || 0.85);
  const updateBgmVolume = (value: number) => {
    if (value > 0) previousBgm.current = value;
    setBgmVolume(value);
  };
  const updateSfxVolume = (value: number) => {
    if (value > 0) previousSfx.current = value;
    setSfxVolume(value);
    if (value > 0 && !audio.muted) void ensureStarted();
  };
  const toggleBgm = () => {
    if (bgmVolume > 0) previousBgm.current = bgmVolume;
    setBgmVolume(bgmVolume > 0 ? 0 : previousBgm.current);
  };
  const toggleSfx = () => {
    if (sfxVolume > 0) previousSfx.current = sfxVolume;
    setSfxVolume(sfxVolume > 0 ? 0 : previousSfx.current);
    if (!audio.muted && sfxVolume === 0) void ensureStarted();
  };
  const setVolume = (category: "master" | "ambience" | "vehicle", value: number) => {
    audio.setVolume(category, value);
    if (value > 0 && !audio.muted) void ensureStarted();
  };
  return (
    <section className="settings-card" data-settings-audio aria-label="Suara & musik">
      <h3 className="settings-card-title">Suara & musik</h3>
      <SettingsSwitch
        label="Semua suara"
        checked={!audio.muted}
        onChange={() => {
          audio.toggleMuted();
          if (audio.muted) void ensureStarted();
        }}
      />
      <SettingsSwitch label="BGM" checked={bgmVolume > 0} onChange={toggleBgm} />
      <SettingsSwitch label="Efek suara" checked={sfxVolume > 0} onChange={toggleSfx} />
      <div className="settings-divider" />
      <div className="settings-volume-list">
        <VolumeSlider
          label="Volume utama"
          value={audio.master}
          onChange={(value) => setVolume("master", value)}
        />
      </div>
      <details className="settings-audio-details">
        <summary>Volume lanjutan</summary>
        <div className="settings-volume-list">
          <VolumeSlider label="Musik (BGM)" value={bgmVolume} onChange={updateBgmVolume} />
          <VolumeSlider label="Efek (SFX)" value={sfxVolume} onChange={updateSfxVolume} />
          <VolumeSlider
            label="Suasana dunia"
            value={audio.ambience}
            onChange={(value) => setVolume("ambience", value)}
          />
          <VolumeSlider
            label="Kendaraan"
            value={audio.vehicle}
            onChange={(value) => setVolume("vehicle", value)}
          />
        </div>
      </details>
    </section>
  );
}

export function GameSettingsPanel() {
  const settings = useGameSettings();
  const profile = useProfile((state) => state.profile);
  const setSheet = useHud((state) => state.setSheet);
  const [copyStatus, setCopyStatus] = useState("");
  const copyId = async () => {
    if (!profile?.id) return;
    try {
      await navigator.clipboard.writeText(profile.id);
      setCopyStatus("ID pemain berhasil disalin.");
    } catch {
      setCopyStatus("Belum bisa menyalin. Pilih dan salin ID secara manual.");
    }
  };
  return (
    <div className="game-settings-layout" data-game-settings>
      <div className="game-settings-column">
        <SoundSettings />
        <section className="settings-card" aria-label="Tampilan game">
          <h3 className="settings-card-title">Tampilan game</h3>
          <p className="settings-note">Kualitas grafis</p>
          <div className="settings-quality" role="group" aria-label="Kualitas grafis">
            {QUALITY_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={settings.graphics === value}
                onClick={() => settings.update({ graphics: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <p className="settings-note">Otomatis menyesuaikan resolusi dan bayangan.</p>
          <div className="settings-divider" />
          <p className="settings-note">Ukuran UI</p>
          <div className="settings-quality settings-ui-size" role="group" aria-label="Ukuran UI">
            {UI_SIZE_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                aria-pressed={settings.uiSize === value}
                onClick={() => settings.update({ uiSize: value })}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="settings-fullscreen">
            <FullscreenController />
          </div>
        </section>
      </div>
      <div className="game-settings-column">
        <section className="settings-card" aria-label="Pemain">
          <h3 className="settings-card-title">Pemain</h3>
          <div className="settings-copy-row">
            <span>ID</span>
            <code className="settings-account-id">{profile?.id || "Belum tersedia"}</code>
            <button
              type="button"
              className="settings-action"
              aria-label="Salin ID pemain"
              disabled={!profile?.id}
              onClick={() => void copyId()}
            >
              Salin
            </button>
          </div>
          {copyStatus && (
            <p className="settings-status" role="status">
              {copyStatus}
            </p>
          )}
          <div className="settings-divider" />
          <div className="settings-shortcuts">
            <button type="button" className="settings-action" onClick={() => setSheet("profile")}>
              Profil karakter
            </button>
            <button type="button" className="settings-action" onClick={() => setSheet("help")}>
              Panduan kontrol
            </button>
          </div>
        </section>
        <section className="settings-card" aria-label="Kontrol permainan">
          <h3 className="settings-card-title">Kontrol permainan</h3>
          <label className="settings-slider">
            <span className="settings-slider-label">
              <span>Sensitivitas kamera</span>
              <span>{settings.cameraSensitivity.toFixed(1)}×</span>
            </span>
            <input
              aria-label="Sensitivitas kamera"
              type="range"
              min="0.4"
              max="2"
              step="0.1"
              value={settings.cameraSensitivity}
              onChange={(event) => settings.update({ cameraSensitivity: +event.target.value })}
            />
          </label>
          <label className="settings-slider">
            <span className="settings-slider-label">
              <span>Sensitivitas analog</span>
              <span>{settings.joystickSensitivity.toFixed(1)}×</span>
            </span>
            <input
              aria-label="Sensitivitas analog"
              type="range"
              min="0.5"
              max="1.5"
              step="0.1"
              value={settings.joystickSensitivity}
              onChange={(event) => settings.update({ joystickSensitivity: +event.target.value })}
            />
          </label>
          <div className="settings-divider" />
          <SettingsSwitch
            label="Tampilkan tracker quest"
            checked={settings.showQuest}
            onChange={() => settings.update({ showQuest: !settings.showQuest })}
          />
          <SettingsSwitch
            label="Diagnostik performa"
            checked={settings.diagnostics}
            onChange={() => settings.update({ diagnostics: !settings.diagnostics })}
          />
        </section>
        <button
          type="button"
          className="settings-action settings-action-secondary"
          onClick={() => setSheet("phone")}
        >
          Kembali ke handphone
        </button>
      </div>
    </div>
  );
}
