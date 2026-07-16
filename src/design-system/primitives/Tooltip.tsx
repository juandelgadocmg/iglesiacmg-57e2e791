import * as React from "react";
import { Tooltip as STooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Tooltip DOXA — wrapper simplificado. Provider global se monta una vez en App.
 */
export interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  delay?: number;
  disabled?: boolean;
}

export function Tooltip({ content, children, side = "top", align = "center", delay = 200, disabled }: TooltipProps) {
  if (disabled) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={delay}>
      <STooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          side={side}
          align={align}
          className="bg-fg text-background text-xs px-2 py-1 rounded-md border-0 shadow-elev-4"
        >
          {content}
        </TooltipContent>
      </STooltip>
    </TooltipProvider>
  );
}
