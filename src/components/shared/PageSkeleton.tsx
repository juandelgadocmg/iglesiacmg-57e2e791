import { cn } from "@/lib/utils";

/**
 * PageSkeleton — Stripe/Linear style. Premium loading state that
 * matches the shape of a typical DOXA page: hero + KPIs + workspace.
 * Uses the .skeleton-shimmer utility from index.css.
 */
export default function PageSkeleton({
  variant = "dashboard",
  className,
}: {
  variant?: "dashboard" | "list" | "form" | "profile";
  className?: string;
}) {
  return (
    <div className={cn("animate-fade-in space-y-5", className)} aria-busy="true" aria-live="polite">
      {/* Hero block */}
      <div className="rounded-2xl border bg-card overflow-hidden">
        <div className="h-1 skeleton-shimmer" />
        <div className="p-5 md:p-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl skeleton-shimmer" />
            <div className="space-y-2 flex-1 min-w-0">
              <div className="h-3 w-24 rounded skeleton-shimmer" />
              <div className="h-5 w-56 max-w-full rounded skeleton-shimmer" />
              <div className="h-3 w-72 max-w-full rounded skeleton-shimmer" />
            </div>
          </div>
          {variant !== "form" && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border bg-background/60 p-3 space-y-2">
                  <div className="h-2.5 w-16 rounded skeleton-shimmer" />
                  <div className="h-6 w-20 rounded skeleton-shimmer" />
                  <div className="h-2.5 w-24 rounded skeleton-shimmer" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Body block */}
      {variant === "dashboard" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 rounded-2xl border bg-card p-5 space-y-3">
            <div className="h-4 w-40 rounded skeleton-shimmer" />
            <div className="h-56 rounded-lg skeleton-shimmer" />
          </div>
          <div className="rounded-2xl border bg-card p-5 space-y-3">
            <div className="h-4 w-32 rounded skeleton-shimmer" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full skeleton-shimmer" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 w-3/4 rounded skeleton-shimmer" />
                  <div className="h-2.5 w-1/2 rounded skeleton-shimmer" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {variant === "list" && (
        <div className="rounded-2xl border bg-card divide-y">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="p-4 flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg skeleton-shimmer" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 w-1/3 rounded skeleton-shimmer" />
                <div className="h-2.5 w-1/2 rounded skeleton-shimmer" />
              </div>
              <div className="h-7 w-16 rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      )}

      {variant === "profile" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="rounded-2xl border bg-card p-6 space-y-3 lg:col-span-1">
            <div className="h-24 w-24 rounded-full mx-auto skeleton-shimmer" />
            <div className="h-4 w-2/3 mx-auto rounded skeleton-shimmer" />
            <div className="h-3 w-1/2 mx-auto rounded skeleton-shimmer" />
          </div>
          <div className="lg:col-span-2 space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border bg-card p-4 space-y-2">
                <div className="h-3 w-1/4 rounded skeleton-shimmer" />
                <div className="h-4 w-3/4 rounded skeleton-shimmer" />
              </div>
            ))}
          </div>
        </div>
      )}

      {variant === "form" && (
        <div className="rounded-2xl border bg-card p-6 space-y-4 max-w-2xl">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="space-y-1.5">
              <div className="h-2.5 w-24 rounded skeleton-shimmer" />
              <div className="h-9 w-full rounded skeleton-shimmer" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
