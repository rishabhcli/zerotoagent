"use client";

import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cva, type VariantProps } from "class-variance-authority";
import { glassSurfaceVariants } from "@/components/ui/glass-surface.styles";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/button relative inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap border border-transparent bg-clip-padding text-sm font-medium text-foreground outline-none select-none transition-all focus-visible:ring-4 focus-visible:ring-ring/40 disabled:pointer-events-none disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-4 aria-invalid:ring-destructive/20 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default:
          "text-primary-foreground shadow-none [--surface-fill:var(--glass-button-fill)] [--surface-shadow:var(--glass-shadow-button)] [--surface-shadow-hover:var(--glass-shadow-button-hover)]",
        outline:
          "text-foreground/92 shadow-none [--surface-fill:var(--glass-fill-strong)] [--surface-shadow:var(--glass-shadow-quiet)] [--surface-shadow-hover:var(--glass-shadow-card)]",
        secondary:
          "text-foreground shadow-none [--surface-fill:var(--glass-fill)] [--surface-shadow:var(--glass-shadow-card)] [--surface-shadow-hover:var(--glass-shadow-hover)]",
        ghost:
          "bg-white/[0.06] text-foreground shadow-[inset_0_1px_0_rgb(255_255_255_/_0.08)] hover:bg-white/[0.09] dark:bg-white/[0.04] dark:hover:bg-white/[0.08]",
        destructive:
          "text-red-50 shadow-none [--surface-fill:linear-gradient(180deg,rgb(255_116_142_/_0.95),rgb(197_55_82_/_0.92))] [--surface-shadow:0_20px_44px_-24px_rgb(130_23_44_/_0.5),inset_0_1px_0_rgb(255_255_255_/_0.18)] [--surface-shadow-hover:0_28px_60px_-30px_rgb(130_23_44_/_0.58),inset_0_1px_0_rgb(255_255_255_/_0.24)]",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default:
          "h-10 px-4 text-sm has-data-[icon=inline-end]:pr-3 has-data-[icon=inline-start]:pl-3",
        xs: "h-7 rounded-full px-2.5 text-xs [&_svg:not([class*='size-'])]:size-3",
        sm: "h-8 rounded-full px-3 text-[0.82rem] [&_svg:not([class*='size-'])]:size-3.5",
        lg: "h-12 rounded-full px-5 text-sm has-data-[icon=inline-end]:pr-4 has-data-[icon=inline-start]:pl-4",
        icon: "size-10 rounded-full",
        "icon-xs": "size-7 rounded-full [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-8 rounded-full",
        "icon-lg": "size-12 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

function Button({
  className,
  variant = "default",
  size = "default",
  ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
  const interactiveSurface = variant !== "link" && variant !== "ghost";
  const surfaceVariant =
    variant === "default"
      ? "button"
      : variant === "secondary"
        ? "card"
        : variant === "outline" || variant === "destructive"
          ? "pill"
          : undefined;

  return (
    <ButtonPrimitive
      data-slot="button"
      className={cn(
        buttonVariants({ variant, size }),
        interactiveSurface &&
          surfaceVariant &&
          glassSurfaceVariants({ variant: surfaceVariant, interactive: true }),
        className
      )}
      {...props}
    />
  );
}

export { Button, buttonVariants };
