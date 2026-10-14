import React from "react";
import { joinChannel } from "./channels";
export function GameCanvas() {
  window.gameMounts = (window.gameMounts ?? 0) + 1;
  return <div>Game canvas</div>;
}
export function GameUi() {
  return null;
}
export function WorldLobby({ onReplayIntro }) {
  return (
    <div>
      <h1>Lobby</h1>
      <button onClick={onReplayIntro}>Tonton ulang cerita</button>
      <button onClick={() => joinChannel()}>Masuk channel</button>
    </div>
  );
}
