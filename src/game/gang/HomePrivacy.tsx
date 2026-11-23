import { GameButton } from "@/ui/game-ui/GamePanel";
import { gangCommand, useGang } from "./store";
import type { HomePrivacyMode } from "./model";

export function HomePrivacy() {
  const privacy = useGang((s) => s.data?.privacy);
  const disabled = useGang((s) => s.busy || !!s.retry);
  if (!privacy) return null;
  return (
    <section className="gang-privacy" aria-label={privacy.text.title}>
      <strong>{privacy.text.title}</strong>
      <p>{privacy.text.hint}</p>
      <div className="gang-decor-options">
        {(Object.entries(privacy.text.options) as [HomePrivacyMode, string][]).map(
          ([value, label]) => (
            <GameButton
              key={value}
              disabled={disabled}
              aria-pressed={privacy.value === value}
              onClick={() => void gangCommand("privacy", { privacy: value })}
            >
              {label}
            </GameButton>
          ),
        )}
      </div>
      {privacy.value === "friends" && <p>{privacy.text.friends_hint}</p>}
    </section>
  );
}
