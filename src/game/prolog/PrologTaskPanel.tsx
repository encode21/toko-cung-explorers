import { Minus } from "lucide-react";
import type { ReactNode } from "react";
import { useWarung } from "@/game/warung/store";
import { useHud } from "@/state/hud-store";
import { GameIconButton } from "@/ui/game-ui/GamePanel";
import { prologProgress } from "./progress";
import { useProlog } from "./store";

function closeTask() {
  useHud.getState().setPrologOpen(false);
}

export function PrologTaskPanel({
  title,
  open,
  children,
  footer,
  onClose = closeTask,
}: {
  title: string;
  open: boolean;
  children?: ReactNode;
  footer?: ReactNode;
  onClose?: () => void;
}) {
  const inWarung = useWarung((s) => !!s.inside);
  const data = useProlog((s) => s.data);
  if (!open) {
    return (
      <span
        id="prolog-task-tooltip"
        className="prolog-task-tooltip"
        role="tooltip"
        data-prolog-warung={inWarung || undefined}
      >
        {title}
      </span>
    );
  }

  const collapse = () => {
    onClose();
    document.querySelector<HTMLElement>('[data-side-action="prolog"]')?.focus();
  };
  const progress = prologProgress(data);
  return (
    <section
      id="prolog-task-panel"
      className="prolog-task-panel"
      aria-labelledby="prolog-task-title"
      role="region"
      data-prolog-warung={inWarung || undefined}
      data-ui-panel
      data-hud-control
      onKeyDown={(event) => {
        if (event.code === "Space" && event.target instanceof HTMLButtonElement)
          event.stopPropagation();
        if (event.key === "Escape") {
          event.stopPropagation();
          collapse();
        }
      }}
    >
      <header className="prolog-task-header">
        <h2 id="prolog-task-title">{title}</h2>
        <GameIconButton className="prolog-task-collapse" label="Lipat Prolog" onClick={collapse}>
          <Minus aria-hidden />
        </GameIconButton>
      </header>
      {(children || progress || footer) && (
        <div className="prolog-task-content">
          {(children || progress) && (
            <div className="prolog-task-body">
              {children}
              {progress && (
                <div className="prolog-task-steps">
                  <p className="prolog-step-label">
                    Langkah {progress.current} dari {progress.total}
                  </p>
                  <div
                    className="prolog-step-progress"
                    role="progressbar"
                    aria-label="Progres Prolog"
                    aria-valuemin={0}
                    aria-valuemax={progress.total}
                    aria-valuenow={progress.completed}
                    aria-valuetext={`${progress.completed} dari ${progress.total} langkah selesai`}
                  >
                    {Array.from({ length: progress.total }, (_, index) => (
                      <span
                        key={index}
                        className="prolog-step-progress-segment"
                        data-state={
                          index < progress.completed
                            ? "done"
                            : index === progress.completed
                              ? "current"
                              : "pending"
                        }
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          {footer && <div className="quest-tracker prolog-actions">{footer}</div>}
        </div>
      )}
    </section>
  );
}
