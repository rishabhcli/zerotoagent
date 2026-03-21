import { cva, type VariantProps } from "class-variance-authority";

export const glassSurfaceVariants = cva("glass-surface", {
  variants: {
    variant: {
      nav: "glass-nav",
      "hero-panel": "glass-hero-panel",
      card: "glass-card",
      button: "glass-button",
      pill: "glass-pill",
      "quiet-panel": "glass-quiet-panel",
      table: "glass-table-shell",
    },
    interactive: {
      true: "surface-interactive",
      false: "",
    },
  },
  defaultVariants: {
    variant: "card",
    interactive: true,
  },
});

export type GlassSurfaceVariantProps = VariantProps<typeof glassSurfaceVariants>;
