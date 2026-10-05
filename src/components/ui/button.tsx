import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground shadow hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90",
        // Explicit text-foreground: tanpa ini, di dalam .hud-glass teks putih menempel di bg putih.
        outline:
          "border border-input bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground shadow-sm hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
        active:
          "border border-world-online/60 bg-world-online text-world-active-foreground shadow-sm hover:bg-world-online/90",
        purchase: "bg-world-accent text-world-accent-foreground shadow hover:bg-world-accent/90",
        /** CTA utama di panel dunia (HUD gelap). */
        world:
          "bg-world-brand text-world-brand-foreground shadow hover:brightness-110 focus-visible:ring-world-accent",
        /** Tombol sekunder di panel dunia — kontras aman di atas hud-glass. */
        worldOutline:
          "border border-world-outline bg-world-panel-foreground/12 text-world-panel-foreground shadow-sm hover:bg-world-panel-foreground/20 focus-visible:ring-world-accent",
        worldGhost:
          "text-world-muted hover:bg-world-panel hover:text-world-panel-foreground focus-visible:ring-world-accent",
        worldSoft:
          "border border-world-outline bg-world-panel-foreground text-world-accent-foreground shadow-sm hover:bg-world-muted hover:text-world-accent-foreground focus-visible:ring-world-accent",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-10 rounded-md px-8",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
