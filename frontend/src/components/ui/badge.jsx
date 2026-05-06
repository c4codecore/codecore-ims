import * as React from "react";
import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default:     "border-primary/20 bg-primary/10 text-primary",
        secondary:   "border-border bg-secondary text-secondary-foreground",
        destructive: "border-destructive/20 bg-destructive/10 text-destructive",
        outline:     "border-border bg-transparent text-foreground",
        success:     "border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
        warning:     "border-amber-500/20 bg-amber-500/10 text-amber-600 dark:text-amber-400",
        info:        "border-blue-500/20 bg-blue-500/10 text-blue-600 dark:text-blue-400",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

function Badge({ className, variant, children, ...props }) {
  return (
    <span
      data-slot="badge"
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    >
      {children}
    </span>
  );
}

export { Badge, badgeVariants };
