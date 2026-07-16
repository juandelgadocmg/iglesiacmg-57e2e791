import * as React from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface DrawerProps {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  side?: "left" | "right" | "top" | "bottom";
  size?: "sm" | "md" | "lg" | "xl";
  footer?: React.ReactNode;
  children?: React.ReactNode;
  className?: string;
}

const sizeMap = { sm: "w-[320px]", md: "w-[420px]", lg: "w-[560px]", xl: "w-[720px]" };

export function Drawer({
  open, onOpenChange, title, description, side = "right", size = "md", footer, children, className,
}: DrawerProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side={side}
        className={cn(
          "p-0 border-border shadow-elev-5 flex flex-col",
          side === "right" || side === "left" ? sizeMap[size] : "",
          className
        )}
      >
        {(title || description) && (
          <SheetHeader className="px-5 py-4 border-b border-border-subtle text-left space-y-1">
            {title && <SheetTitle className="text-base font-semibold text-fg">{title}</SheetTitle>}
            {description && <SheetDescription className="text-xs text-fg-muted">{description}</SheetDescription>}
          </SheetHeader>
        )}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-border-subtle bg-surface-2/40 flex items-center justify-end gap-2">
            {footer}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
