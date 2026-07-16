import { cn } from "@/lib/utils";

export function Divider({
  orientation = "horizontal",
  label,
  className,
}: {
  orientation?: "horizontal" | "vertical";
  label?: React.ReactNode;
  className?: string;
}) {
  if (orientation === "vertical") {
    return <span className={cn("inline-block w-px h-4 bg-border-subtle mx-2", className)} />;
  }
  if (label) {
    return (
      <div className={cn("flex items-center gap-3 my-4", className)}>
        <span className="h-px flex-1 bg-border-subtle" />
        <span className="text-[11px] font-semibold uppercase tracking-wider text-fg-subtle">{label}</span>
        <span className="h-px flex-1 bg-border-subtle" />
      </div>
    );
  }
  return <hr className={cn("border-0 h-px bg-border-subtle my-3", className)} />;
}
