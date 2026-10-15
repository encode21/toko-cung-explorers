import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from "react";
import { ChevronDown, ChevronUp, Navigation, Star } from "lucide-react";
import "./quest-tracker.css";

export interface QuestTrackerCardProps extends Omit<HTMLAttributes<HTMLElement>, "title"> {
  label: string;
  title: string;
  summary?: ReactNode;
  count?: ReactNode;
  expanded: boolean;
  onToggle: () => void;
  toggleLabel?: string | undefined;
  progress?: { value: number; max: number; label: string; valueText?: string } | undefined;
  error?: string | null | undefined;
  errorRole?: "status" | "alert";
  footer?: ReactNode;
  children?: ReactNode;
}

/** Shared quest presentation; each tracker keeps its own state and gameplay actions. */
export function QuestTrackerCard({
  label,
  title,
  summary,
  count,
  expanded,
  onToggle,
  toggleLabel,
  progress,
  error,
  errorRole = "status",
  footer,
  children,
  className,
  ...props
}: QuestTrackerCardProps) {
  const progressMax = progress && Number.isFinite(progress.max) ? Math.max(1, progress.max) : 1;
  const progressValue =
    progress && Number.isFinite(progress.value)
      ? Math.min(progressMax, Math.max(0, progress.value))
      : 0;

  return (
    <section
      {...props}
      aria-label={props["aria-label"] ?? title}
      data-ui-panel
      data-hud-control
      data-quest-tracker-card
      className={["mmo-tracker", "quest-tracker", expanded ? "mmo-tracker-expanded" : "", className]
        .filter(Boolean)
        .join(" ")}
    >
      <button
        type="button"
        className="quest-tracker-toggle"
        aria-label={toggleLabel}
        aria-expanded={expanded}
        onClick={onToggle}
      >
        <span className="quest-tracker-summary">
          <span className="quest-tracker-meta">
            <span className="quest-tracker-badge">
              <Star aria-hidden fill="currentColor" strokeWidth={0} />
              {label}
            </span>
            {count != null && <span className="quest-tracker-step">{count}</span>}
          </span>
          <strong className="quest-tracker-title">{title}</strong>
          {!expanded && summary != null && (
            <span className="quest-tracker-objective">{summary}</span>
          )}
        </span>
        {expanded ? (
          <ChevronUp className="quest-tracker-chevron" aria-hidden />
        ) : (
          <ChevronDown className="quest-tracker-chevron" aria-hidden />
        )}
      </button>
      {progress && (
        <progress
          className="quest-tracker-progress"
          aria-label={progress.label}
          aria-valuetext={progress.valueText}
          value={progressValue}
          max={progressMax}
        />
      )}
      {expanded && children != null && <div className="quest-tracker-details">{children}</div>}
      {footer != null && typeof footer !== "boolean" && (
        <div className="quest-tracker-footer">{footer}</div>
      )}
      {error && (
        <p role={errorRole} className="quest-tracker-error">
          {error}
        </p>
      )}
    </section>
  );
}

export function QuestTrackerButton({
  variant = "primary",
  type = "button",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "danger";
}) {
  return (
    <button
      {...props}
      type={type}
      className={`quest-tracker-button quest-tracker-button--${variant} ${className}`}
    />
  );
}

export function QuestTrackerGuidance({ children }: { children: ReactNode }) {
  return (
    <div className="quest-tracker-guidance">
      <Navigation aria-hidden fill="currentColor" />
      <div>{children}</div>
    </div>
  );
}
