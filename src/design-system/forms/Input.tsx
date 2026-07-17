import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

export const inputVariants = cva(
  "w-full bg-surface-1 text-fg placeholder:text-fg-subtle border transition-colors " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:border-primary/60 " +
    "disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-2",
  {
    variants: {
      size: {
        sm: "h-11 text-[15px] rounded-lg px-3.5",
        md: "h-[52px] text-base rounded-lg px-4",
        lg: "h-14 text-base rounded-lg px-5",
      },
      state: {
        default: "border-border hover:border-border-strong",
        error: "border-destructive/60 focus-visible:ring-destructive/30",
        success: "border-success/60 focus-visible:ring-success/30",
      },
    },
    defaultVariants: { size: "md", state: "default" },
  }
);

export interface InputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "size">,
    VariantProps<typeof inputVariants> {
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
  leadingAddon?: React.ReactNode;
  trailingAddon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, size, state, leadingIcon, trailingIcon, leadingAddon, trailingAddon, ...props }, ref) => {
    if (leadingIcon || trailingIcon || leadingAddon || trailingAddon) {
      return (
        <div className={cn("relative flex items-stretch", className)}>
          {leadingAddon && (
            <span className="inline-flex items-center px-2.5 text-xs text-fg-muted bg-surface-2 border border-r-0 border-border rounded-l-lg">
              {leadingAddon}
            </span>
          )}
          {leadingIcon && (
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-fg-subtle pointer-events-none [&_svg]:size-4">
              {leadingIcon}
            </span>
          )}
          <input
            ref={ref}
            className={cn(
              inputVariants({ size, state }),
              leadingIcon && "pl-8",
              trailingIcon && "pr-9",
              leadingAddon && "rounded-l-none border-l-0",
              trailingAddon && "rounded-r-none border-r-0"
            )}
            {...props}
          />
          {trailingIcon && (
            <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-fg-subtle [&_svg]:size-4">
              {trailingIcon}
            </span>
          )}
          {trailingAddon && (
            <span className="inline-flex items-center px-2.5 text-xs text-fg-muted bg-surface-2 border border-l-0 border-border rounded-r-lg">
              {trailingAddon}
            </span>
          )}
        </div>
      );
    }
    return <input ref={ref} className={cn(inputVariants({ size, state }), className)} {...props} />;
  }
);
Input.displayName = "DoxaInput";
