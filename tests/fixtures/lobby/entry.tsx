import React from "react";
import { createRoot } from "react-dom/client";
import { ChannelSelector } from "@/ui/ChannelSelector";
import "@/styles.css";
import "@/ui/entry/entry.css";

function LobbyFixture() {
  return (
    <main className="world-viewport" data-game-viewport style={{ position: "fixed", inset: 0 }}>
      <div
        className="game-runtime-root game-ui"
        data-game-ui-root
        style={{ position: "absolute", inset: 0 }}
      >
        <div className="adventure-shell lobby-shell" style={{ height: "100%", minHeight: 0 }}>
          <div className="adventure-content">
            <div className="lobby-stage">
              <section className="lobby-card" aria-label="Lobby dunia">
                <div className="lobby-channels-body">
                  <ChannelSelector />
                </div>
              </section>
              <nav className="lobby-side-actions" aria-label="Aksi lobby">
                <a href="/" className="lobby-circle-button lobby-circle-home" aria-label="Menu utama">
                  ◯
                </a>
              </nav>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<LobbyFixture />);
