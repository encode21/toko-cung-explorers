import { Angry, Armchair, Bed, Laugh } from "lucide-react";
import { CHAT_EMOTES } from "@/game/social/chat-emotes";

const EMOTE_ICONS = { sit: Armchair, lie: Bed, angry: Angry, laugh: Laugh };

/** Local preview only; selecting a pose never broadcasts or changes the player's action. */
export function AppearanceEmotes({
  animation,
  onChange,
}: {
  animation: string | undefined;
  onChange: (animation: string | undefined) => void;
}) {
  return (
    <section className="appearance-emotes" aria-label="Pilihan emote">
      <div className="appearance-emote-grid" role="group" aria-label="Pratinjau emote">
        {CHAT_EMOTES.map((emote) => {
          const Icon = EMOTE_ICONS[emote.id];
          const active = animation === emote.animation;
          return (
            <button
              type="button"
              key={emote.id}
              aria-label={emote.label}
              aria-pressed={active}
              onClick={() => onChange(active ? undefined : emote.animation)}
            >
              <span className="appearance-emote-art" aria-hidden>
                <Icon />
              </span>
              <span>{emote.label}</span>
            </button>
          );
        })}
      </div>
      <p>Pilih emote untuk melihat pose. Ketuk lagi untuk kembali berdiri.</p>
    </section>
  );
}
