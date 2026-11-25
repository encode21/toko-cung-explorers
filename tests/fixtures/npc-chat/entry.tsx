import { createRoot } from "react-dom/client";
import { CungChatApp } from "@/ui/hud/CungChatApp";
import { PhoneAppScreen } from "@/ui/hud/PhonePanel";
import { useGame } from "@/state/game-store";
import "@/styles.css";
useGame.setState({ overlay: "none" });
createRoot(document.getElementById("root")!).render(
  <main
    style={{
      height: "100dvh",
      display: "grid",
      placeItems: "center",
      background: "#dce7cc",
      fontFamily: "sans-serif",
      padding: 8,
    }}
  >
    <div
      style={{
        width: "min(400px, calc(100vw - 16px))",
        height: "min(780px, calc(100dvh - 16px))",
        display: "flex",
      }}
    >
      <PhoneAppScreen app="cungchat" title="Chat">
        <CungChatApp />
      </PhoneAppScreen>
    </div>
  </main>,
);
