/**
 * Motion presets para framer-motion.
 * Duraciones y easings coinciden con los tokens de `src/index.css`.
 */
import type { Transition, Variants } from "framer-motion";

export const easings = {
  standard: [0.2, 0.8, 0.2, 1] as const,
  emphasized: [0.16, 1, 0.3, 1] as const,
  exit: [0.4, 0, 1, 1] as const,
};

export const durations = { fast: 0.12, base: 0.18, slow: 0.24, page: 0.32 };

export const transitions = {
  fast: { duration: durations.fast, ease: easings.standard } as Transition,
  base: { duration: durations.base, ease: easings.standard } as Transition,
  slow: { duration: durations.slow, ease: easings.emphasized } as Transition,
  page: { duration: durations.page, ease: easings.emphasized } as Transition,
};

export const fadeInUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: transitions.base },
  exit: { opacity: 0, y: -4, transition: { duration: durations.fast, ease: easings.exit } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: transitions.base },
  exit: { opacity: 0, scale: 0.98, transition: { duration: durations.fast, ease: easings.exit } },
};

export const stagger = (delay = 0.04): Variants => ({
  animate: { transition: { staggerChildren: delay } },
});
