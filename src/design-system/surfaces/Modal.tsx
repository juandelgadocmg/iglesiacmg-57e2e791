import * as React from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export interface ModalProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const sizeMap = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
};

/** Modal DOXA — wrapper del Dialog shadcn con jerarquía y footer estándar. */
export function Modal({
  open, onOpenChange, title, description, icon: Icon, size = "md", footer, children, className,
}: ModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn(sizeMap[size], "rounded-2xl border-border shadow-elev-5 p-0", className)}>
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border-subtle text-left space-y-1">
          <div className="flex items-start gap-3">
            {Icon && (
              <span className="inline-flex items-center justify-center size-9 rounded-lg bg-primary/8 text-primary">
                <Icon className="size-4" />
              </span>
            )}
            <div className="flex-1 min-w-0">
              {title && <DialogTitle className="text-base font-semibold text-fg">{title}</DialogTitle>}
              {description && <DialogDescription className="text-xs text-fg-muted mt-0.5">{description}</DialogDescription>}
            </div>
          </div>
        </DialogHeader>
        {children && <div className="px-6 py-5">{children}</div>}
        {footer && (
          <DialogFooter className="px-6 py-4 border-t border-border-subtle bg-surface-2/40 gap-2 sm:gap-2">
            {footer}
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
