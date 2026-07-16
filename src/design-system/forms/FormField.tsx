import * as React from "react";
import { AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label?: React.ReactNode;
  htmlFor?: string;
  hint?: React.ReactNode;
  description?: React.ReactNode;
  error?: React.ReactNode;
  required?: boolean;
  optional?: boolean;
  children: React.ReactNode;
  className?: string;
}

/** Contenedor canónico para inputs: label + hint + control + error. */
export function FormField({
  label, htmlFor, hint, description, error, required, optional, children, className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <div className="flex items-center justify-between gap-2">
          <label htmlFor={htmlFor} className="text-[13px] font-medium text-fg inline-flex items-center gap-1">
            {label}
            {required && <span className="text-destructive">*</span>}
            {optional && <span className="text-fg-subtle text-[11px] font-normal">(opcional)</span>}
          </label>
          {hint && <span className="text-[11px] text-fg-subtle inline-flex items-center gap-1"><Info className="size-3" /> {hint}</span>}
        </div>
      )}
      {description && <p className="text-xs text-fg-muted">{description}</p>}
      {children}
      {error && (
        <p className="text-xs text-destructive inline-flex items-center gap-1">
          <AlertCircle className="size-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

export function Fieldset({
  legend, description, children, className,
}: {
  legend?: React.ReactNode; description?: React.ReactNode; children: React.ReactNode; className?: string;
}) {
  return (
    <fieldset className={cn("space-y-4 p-4 border border-border-subtle rounded-xl", className)}>
      {legend && <legend className="px-1 text-sm font-semibold text-fg">{legend}</legend>}
      {description && <p className="text-xs text-fg-muted -mt-2">{description}</p>}
      {children}
    </fieldset>
  );
}
