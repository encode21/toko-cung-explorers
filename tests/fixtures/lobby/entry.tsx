import React from "react";
import { createRoot } from "react-dom/client";
import { ChannelSelector } from "@/ui/ChannelSelector";
import "@/styles.css";
import "@/ui/entry/entry.css";

function LobbyFixture() {
  return (
    <main className="world-viewport" data-game-viewport style={{ position: "fixed", inset: 0 }}>
      <div className="game-runtime-root game-ui" data-game-ui-root style={{ position: "absolute", inset: 0 }}>
        <div className="adventure-shell lobby-shell" style={{ height: "100%", minHeight: 0 }}>
          <header className="adventure-header">
            <strong>Toko Cung World</strong>
            <span className="adventure-eyebrow">Lobby / 02</span>
          </header>
          <div className="adventure-content">
            <div className="lobby-grid">
              <section className="adventure-panel lobby-identity">
                <header className="lobby-panel-head">
                  <p className="adventure-eyebrow">Identitas penjelajah</p>
                </header>
                <div className="lobby-identity-scroll">
                  <h1>Saddam Sean</h1>
                  <p className="lobby-description">Pilih channel untuk bertemu pemain lain.</p>
                </div>
                <div className="lobby-actions">
                  <button type="button" className="lobby-text-link">
                    Menu utama
                  </button>
                </div>
              </section>
              <div className="adventure-panel lobby-channels">
                <header className="lobby-panel-head">
                  <p className="adventure-eyebrow">02 / Tempat bertemu</p>
                </header>
                <div className="lobby-channels-body">
                  <ChannelSelector />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

createRoot(document.getElementById("root")!).render(<LobbyFixture />);
