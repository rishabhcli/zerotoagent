import { mergeProps } from "@base-ui/react/merge-props";
import { useRender } from "@base-ui/react/use-render";
import { cva, type VariantProps } from "class-variance-authority";
import { glassSurfaceVariants } from "@/components/ui/glass-surface.styles";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  cn(
    "group/badge inline-flex h-7 w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-full border border-transparent px-3 py-0.5 text-[0.72rem] font-medium uppercase tracking-[0.18em] whitespace-nowrap transition-all focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 has-data-[icon=inline-end]:pr-2.5 has-data-[icon=inline-start]:pl-2.5 aria-invalid:border-destructive aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 [&>svg]:pointer-events-none [&>svg]:size-3!",
    glassSurfaceVariants({ variant: "pill", interactive: false })
  ),
  {
    variants: {
      variant: {
        default: "text-primary-foreground [--surface-fill:var(--glass-button-fill)]",
        secondary:
          "text-foreground/92 [--surface-fill:var(--glass-fill)]",
        destructive:
          "text-red-50 [--surface-fill:linear-gradient(180deg,rgb(255_116_142_/_0.95),rgb(197_55_82_/_0.92))] focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40",
        outline:
          "text-foreground/92 [--surface-fill:var(--glass-fill-quiet)]",
        ghost:
          "border-0 bg-transparent text-muted-foreground shadow-none backdrop-blur-none",
        link: "text-primary underline-offset-4 hover:underline",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

function Badge({
  className,
  variant = "default",
  render,
  ...props
}: useRender.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return useRender({
    defaultTagName: "span",
    props: mergeProps<"span">(
      {
        className: cn(badgeVariants({ variant }), className),
      },
      props
    ),
    render,
    state: {
      slot: "badge",
      variant,
    },
  });
}

export { Badge, badgeVariants };
