import * as React from "react";
import { Search, X } from "lucide-react";
import { Input, type InputProps } from "./Input";
import { Kbd } from "../primitives/Kbd";
import { cn } from "@/lib/utils";

export interface SearchInputProps extends Omit<InputProps, "leadingIcon" | "trailingIcon" | "type"> {
  onClear?: () => void;
  shortcut?: string;
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ onClear, shortcut, value, className, ...props }, ref) => {
    const hasValue = value !== undefined && value !== null && value !== "";
    return (
      <Input
        ref={ref}
        type="search"
        value={value as any}
        leadingIcon={<Search />}
        trailingIcon={
          hasValue ? (
            <button type="button" onClick={onClear} className="p-0.5 rounded-sm hover:bg-surface-2" aria-label="Limpiar">
              <X />
            </button>
          ) : shortcut ? (
            <Kbd>{shortcut}</Kbd>
          ) : undefined
        }
        placeholder="Buscar…"
        className={cn(className)}
        {...props}
      />
    );
  }
);
SearchInput.displayName = "DoxaSearchInput";
