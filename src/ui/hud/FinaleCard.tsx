import { useEffect, useRef, useState } from "react";
import { PartyPopper } from "lucide-react";
import { finaleCommand, useFinale } from "@/game/finale/store";
import { openTokoCungApp } from "@/lib/app-bridge";
import { QuestTrackerButton } from "./QuestTrackerCard";
import { ShareResultModal } from "./ShareResultCard";

/** Mbak Sari's optional koperasi card. Seen/click/dismiss go to anonymous daily counts; dismissed = gone. */
function KoperasiCard() {
  const card = useFinale((s) => (s.data?.enabled ? s.data.koperasi : null));
  const seen = useRef(false);
  useEffect(() => {
    if (!card || seen.current) return;
    seen.current = true;
    void finaleCommand("card", { event: "seen" });
  }, [card]);
  if (!card) return null;
  return (
    <aside className="story-finale-koperasi" aria-label={card.title}>
      <p>
        <strong>{card.npc}:</strong> “{card.line}”
      </p>
      <strong>{card.title}</strong>
      <p>{card.body}</p>
      <QuestTrackerButton
        onClick={() => {
          void finaleCommand("card", { event: "click" });
          openTokoCungApp();
        }}
      >
        {card.cta}
      </QuestTrackerButton>
      <QuestTrackerButton
        variant="secondary"
        onClick={() => void finaleCommand("card", { event: "dismiss" })}
      >
        {card.dismiss}
      </QuestTrackerButton>
    </aside>
  );
}

/** Buku Mbah's last chapter: Pak RT's invite, the kampung party, Mbah's sign and the last page. */
export function FinaleCard({ finalReady }: { finalReady: boolean }) {
  const { data, busy, error } = useFinale();
  const [sharing, setSharing] = useState(false);
  useEffect(() => {
    void finaleCommand("state");
  }, [finalReady]);
  if (!data?.enabled || !data.ready) return null;
  const t = data.text;
  return (
    <section className="story-finale" aria-label={data.title} aria-busy={busy}>
      <h3>
        <PartyPopper aria-hidden size={18} /> {data.title}
      </h3>
      {error && <p role="alert">{error}</p>}
      {data.completedAt ? (
        <>
          <p role="status">{t["done"]}</p>
          <p className="story-finale-sign">🪧 {t["sign"]}</p>
          <blockquote>{t["last_page"]}</blockquote>
          <QuestTrackerButton variant="secondary" onClick={() => setSharing(true)}>
            Bagikan
          </QuestTrackerButton>
          {sharing && <ShareResultModal onClose={() => setSharing(false)} />}
          <KoperasiCard />
        </>
      ) : data.partyActive || data.partyStarted ? (
        <>
          <p>{t["party"]}</p>
          <p>
            <strong>Koko Cung:</strong> “{t["koko"]}”
          </p>
          <p>
            <strong>Mbak Sari:</strong> “{t["sari"]}”
          </p>
          <QuestTrackerButton disabled={busy} onClick={() => void finaleCommand("claim")}>
            {t["claim"]}
          </QuestTrackerButton>
        </>
      ) : (
        <>
          <p>
            <strong>{data.host}:</strong> “{t["invite"]}”
          </p>
          <QuestTrackerButton disabled={busy} onClick={() => void finaleCommand("start")}>
            {t["start"]}
          </QuestTrackerButton>
        </>
      )}
    </section>
  );
}
