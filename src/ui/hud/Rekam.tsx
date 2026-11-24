import { useEffect, useState } from "react";
import { quarrelNear, quarrels } from "@/game/npc/quarrel";
import { CLIP_GRABS, CLIP_MS, grabFrame, startClip, stopClip, useClip } from "@/game/sosmed/clip";
import { useGame } from "@/state/game-store";
import { useHud } from "@/state/hud-store";
import "./rekam.css";

/** Floating "Rekam" button while a punch/quarrel is within ~20 m. */
export function RekamButton() {
  const recording = useClip((s) => s.recording);
  const [near, setNear] = useState(false);
  useEffect(() => {
    const t = setInterval(() => {
      const [x, , z] = useGame.getState().playerPos;
      setNear(quarrelNear(quarrels, x, z, 20));
    }, 400);
    return () => clearInterval(t);
  }, []);
  if (!near || recording) return null;
  return (
    <button type="button" data-hud-control className="rekam-button" onClick={startClip}>
      🔴 Rekam
    </button>
  );
}

/** Viewfinder + timer while recording, then the "Upload ke Sosmed" card. */
export function ClipRecorder() {
  const { recording, startedAt, done } = useClip();
  const [ms, setMs] = useState(0);
  useEffect(() => {
    if (!recording) return;
    const timers = [
      ...CLIP_GRABS.map((t) => setTimeout(grabFrame, t)),
      setTimeout(stopClip, CLIP_MS),
    ];
    const tick = setInterval(() => setMs(Date.now() - startedAt), 100);
    return () => {
      timers.forEach(clearTimeout);
      clearInterval(tick);
    };
  }, [recording, startedAt]);
  if (recording)
    return (
      <div className="rekam-overlay" data-rekam-overlay>
        <div className="rekam-frame" aria-hidden />
        <span className="rekam-rec">
          <i /> REC 0:0{Math.min(5, Math.floor(ms / 1000))}
        </span>
        <button type="button" data-hud-control className="rekam-stop" onClick={stopClip}>
          ⏹ Stop
        </button>
      </div>
    );
  if (!done) return null;
  const close = () => useClip.setState({ done: null });
  return (
    <div className="rekam-card" role="dialog" aria-label="Klip tersimpan">
      <img src={done[0]} alt="" />
      <div>
        <strong>Klip tersimpan di draft</strong>
        <div className="rekam-actions">
          <button
            type="button"
            data-hud-control
            className="rekam-upload"
            onClick={() => {
              close();
              useHud.getState().setSheet("sosmed");
            }}
          >
            Upload ke Sosmed
          </button>
          <button type="button" data-hud-control onClick={close}>
            Nanti
          </button>
        </div>
      </div>
    </div>
  );
}
