import * as React from "react";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface WizardStep {
  id: string;
  label: string;
  description?: string;
}

/** Stepper visual — horizontal por defecto, vertical opcional. */
export function Wizard({
  steps, currentId, orientation = "horizontal", onStepClick, className,
}: {
  steps: WizardStep[];
  currentId: string;
  orientation?: "horizontal" | "vertical";
  onStepClick?: (id: string) => void;
  className?: string;
}) {
  const currentIdx = steps.findIndex((s) => s.id === currentId);

  if (orientation === "vertical") {
    return (
      <ol className={cn("space-y-4", className)}>
        {steps.map((s, i) => {
          const state = i < currentIdx ? "done" : i === currentIdx ? "current" : "pending";
          return (
            <li key={s.id} className="relative pl-9">
              {i < steps.length - 1 && (
                <span className={cn(
                  "absolute left-3 top-6 bottom-[-1rem] w-px",
                  state === "done" ? "bg-primary" : "bg-border-subtle"
                )} />
              )}
              <button
                type="button"
                onClick={() => onStepClick?.(s.id)}
                className="text-left"
                disabled={!onStepClick}
              >
                <span className={cn(
                  "absolute left-0 top-0 size-6 rounded-full flex items-center justify-center text-[11px] font-semibold",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "current" && "bg-primary/10 text-primary ring-2 ring-primary/30",
                  state === "pending" && "bg-surface-2 text-fg-subtle border border-border"
                )}>
                  {state === "done" ? <Check className="size-3.5" /> : i + 1}
                </span>
                <p className={cn("text-sm font-medium", state !== "pending" ? "text-fg" : "text-fg-muted")}>
                  {s.label}
                </p>
                {s.description && <p className="text-xs text-fg-muted mt-0.5">{s.description}</p>}
              </button>
            </li>
          );
        })}
      </ol>
    );
  }

  return (
    <ol className={cn("flex items-center gap-2 w-full", className)}>
      {steps.map((s, i) => {
        const state = i < currentIdx ? "done" : i === currentIdx ? "current" : "pending";
        return (
          <React.Fragment key={s.id}>
            <li className="flex items-center gap-2 min-w-0">
              <button
                type="button"
                onClick={() => onStepClick?.(s.id)}
                disabled={!onStepClick}
                className={cn(
                  "size-7 shrink-0 rounded-full flex items-center justify-center text-[11px] font-semibold transition-colors",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "current" && "bg-primary/10 text-primary ring-2 ring-primary/30",
                  state === "pending" && "bg-surface-2 text-fg-subtle border border-border"
                )}
              >
                {state === "done" ? <Check className="size-3.5" /> : i + 1}
              </button>
              <span className={cn(
                "text-xs font-medium truncate hidden sm:inline",
                state === "current" ? "text-fg" : "text-fg-muted"
              )}>
                {s.label}
              </span>
            </li>
            {i < steps.length - 1 && (
              <span className={cn("flex-1 h-px", i < currentIdx ? "bg-primary" : "bg-border-subtle")} />
            )}
          </React.Fragment>
        );
      })}
    </ol>
  );
}
