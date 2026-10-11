import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { QuestBoard } from "@/ui/quests/QuestBoard";
import { useGame } from "@/state/game-store";

/** Non-transactional quest terminal; focus and movement lock use the existing overlay. */
export function KioskOverlay() {
  const close = useGame((s) => s.closeOverlay);
  return (
    <Dialog.Root
      open
      onOpenChange={(open) => {
        if (!open) close();
      }}
    >
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Dialog.Content
          data-ui-panel
          aria-describedby={undefined}
          className="fixed inset-x-2 top-[max(0.5rem,env(safe-area-inset-top))] bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-50 mx-auto flex max-w-5xl flex-col overflow-hidden rounded-2xl border border-world-outline quest-journal text-world-panel-foreground shadow-2xl sm:inset-x-6 sm:top-[5dvh] sm:bottom-[5dvh]"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-amber-200/20 bg-[#101e27] px-5 py-3 text-white">
            <Dialog.Title className="font-display text-lg tracking-wide">
              JURNAL PETUALANGAN
            </Dialog.Title>
            <Dialog.Close
              aria-label="Tutup Quest Board"
              className="grid size-11 place-items-center rounded-xl hover:bg-world-outline focus-visible:outline-2 active:scale-95"
            >
              <X className="size-5" />
            </Dialog.Close>
          </header>
          <QuestBoard />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
