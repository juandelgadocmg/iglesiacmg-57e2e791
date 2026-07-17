import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  invalid?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, invalid, rows = 4, ...props }, ref) => (
    <textarea
      ref={ref}
      rows={rows}
      className={cn(
        "w-full bg-surface-1 text-fg placeholder:text-fg-subtle border rounded-lg px-4 py-3 text-base",
        "transition-colors resize-y min-h-[104px]",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary/60",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        invalid ? "border-destructive/60" : "border-border hover:border-border-strong",
        className
      )}
      {...props}
    />
  )
);
Textarea.displayName = "DoxaTextarea";
