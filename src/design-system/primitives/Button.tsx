import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * DOXA Button — primitivo canónico.
 * Variantes inspiradas en Linear/Vercel: primary sólida, secondary suave,
 * outline neutro, ghost, link, destructive. 4 tamaños.
 */
export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap font-medium " +
    "transition-all duration-[var(--motion-fast)] ease-[cubic-bezier(.2,.8,.2,1)] " +
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background " +
    "disabled:pointer-events-none disabled:opacity-50 select-none " +
    "[&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary:
          "bg-primary text-primary-foreground shadow-elev-2 hover:bg-primary/92 active:bg-primary/95 active:shadow-elev-1",
        secondary:
          "bg-surface-2 text-fg border border-border-subtle hover:bg-surface-3 active:bg-surface-3",
        outline:
          "bg-transparent text-fg border border-border hover:bg-surface-2 active:bg-surface-3",
        ghost: "bg-transparent text-fg hover:bg-surface-2 active:bg-surface-3",
        link: "bg-transparent text-primary underline-offset-4 hover:underline p-0 h-auto",
        destructive:
          "bg-destructive text-destructive-foreground shadow-elev-2 hover:bg-destructive/90 active:bg-destructive/95",
        accent:
          "bg-accent text-accent-foreground shadow-elev-2 hover:bg-accent/90 active:bg-accent/95",
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-md [&_svg]:size-3.5",
        sm: "h-8 px-3 text-sm rounded-md [&_svg]:size-4",
        md: "h-9 px-4 text-sm rounded-lg [&_svg]:size-4",
        lg: "h-11 px-5 text-[15px] rounded-lg [&_svg]:size-[18px]",
        icon: "h-9 w-9 rounded-lg [&_svg]:size-4",
        "icon-sm": "h-8 w-8 rounded-md [&_svg]:size-4",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  leadingIcon?: React.ReactNode;
  trailingIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild, loading, leadingIcon, trailingIcon, children, disabled, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={disabled || loading}
        {...props}
      >
        {loading ? <Loader2 className="animate-spin" /> : leadingIcon}
        {children}
        {!loading && trailingIcon}
      </Comp>
    );
  }
);
Button.displayName = "DoxaButton";

export const IconButton = React.forwardRef<HTMLButtonElement, ButtonProps & { label: string }>(
  ({ label, size = "icon", variant = "ghost", ...props }, ref) => (
    <Button ref={ref} size={size} variant={variant} aria-label={label} {...props} />
  )
);
IconButton.displayName = "DoxaIconButton";
