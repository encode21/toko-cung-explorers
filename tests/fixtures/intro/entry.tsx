import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { StoryIntro } from "@/ui/intro/StoryIntro";
import { useWorldViewport } from "@/hooks/use-world-viewport";
import {
  hydrateIntro,
  clearIntro,
  completeIntro,
  retryIntroCompletion,
  useIntro,
} from "@/state/intro-store";
import "@/styles.css";
hydrateIntro("alice", null);
Object.assign(window, {
  introQA: { hydrateIntro, clearIntro, retryIntroCompletion, state: () => useIntro.getState() },
});
function App() {
  const ref = useWorldViewport(),
    dismissed = useIntro((s) => s.dismissed);
  const [replay, setReplay] = useState(false);
  return (
    <main ref={ref} className="world-viewport">
      {!dismissed || replay ? (
        <StoryIntro
          replay={replay}
          onFinish={() => {
            if (replay) setReplay(false);
            else completeIntro();
          }}
        />
      ) : (
        <div style={{ padding: 24, color: "white" }}>
          <h1>Lobby</h1>
          <button onClick={() => setReplay(true)}>Tonton ulang cerita</button>
          <input aria-label="Chat" />
        </div>
      )}
    </main>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
