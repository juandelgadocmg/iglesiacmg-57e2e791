/**
 * Select — envuelve shadcn Select con tokens DOXA.
 * API mínima; para variantes avanzadas usa `@/components/ui/select` directamente.
 */
import * as React from "react";
import {
  Select as SSelect, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
  icon?: React.ReactNode;
}

export interface SelectProps {
  value?: string;
  onValueChange?: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
  size?: "sm" | "md" | "lg";
  disabled?: boolean;
  className?: string;
}

const sizeMap = { sm: "h-8 text-sm", md: "h-9 text-sm", lg: "h-11 text-[15px]" };

export function Select({
  value, onValueChange, options, placeholder = "Selecciona…", size = "md", disabled, className,
}: SelectProps) {
  return (
    <SSelect value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectTrigger
        className={cn(
          "bg-surface-1 border-border hover:border-border-strong rounded-lg px-3",
          sizeMap[size],
          className
        )}
      >
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-lg border-border shadow-elev-4">
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} disabled={o.disabled}>
            <span className="inline-flex items-center gap-2">
              {o.icon}
              {o.label}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </SSelect>
  );
}
