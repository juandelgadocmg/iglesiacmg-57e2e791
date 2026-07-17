import * as React from "react";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

/**
 * DOXA Icon — punto único de tamaño de icono en toda la plataforma.
 * Ningún componente debe usar `h-4 w-4` / `size={16}` con lucide directamente.
 *
 *   xs   16px  micro-adornos dentro de tags / badges
 *   sm   20px  inline en textos y links
 *   md   24px  DEFAULT — botones, sidebar, toolbars
 *   lg   28px  encabezados de sección
 *   xl   32px  hero / feature blocks
 *   2xl  40px  ilustraciones de empty state
 *
 * Tamaños expresados en rem para que escalen con el token global (html font-size).
 */
export type IconSize = "xs" | "sm" | "md" | "lg" | "xl" | "2xl";

const SIZE_CLASS: Record<IconSize, string> = {
  xs: "h-4 w-4",     // 0.8rem  ≈ 16px @ 20px root
  sm: "h-5 w-5",     // 1rem    ≈ 20px
  md: "h-6 w-6",     // 1.2rem  ≈ 24px
  lg: "h-7 w-7",     // 1.4rem  ≈ 28px
  xl: "h-8 w-8",     // 1.6rem  ≈ 32px
  "2xl": "h-10 w-10",// 2rem    ≈ 40px
};

export interface IconProps extends Omit<React.SVGAttributes<SVGSVGElement>, "children"> {
  icon: LucideIcon;
  size?: IconSize;
  /** Fuerza aria-hidden cuando el icono es decorativo (default). */
  decorative?: boolean;
  /** Etiqueta accesible cuando el icono transmite información. */
  label?: string;
}

export const Icon = React.forwardRef<SVGSVGElement, IconProps>(
  ({ icon: LucideCmp, size = "md", decorative = true, label, className, ...rest }, ref) => {
    return (
      <LucideCmp
        ref={ref}
        aria-hidden={decorative && !label ? true : undefined}
        aria-label={label}
        role={label ? "img" : undefined}
        className={cn("shrink-0", SIZE_CLASS[size], className)}
        {...rest}
      />
    );
  }
);
Icon.displayName = "Icon";

export default Icon;
