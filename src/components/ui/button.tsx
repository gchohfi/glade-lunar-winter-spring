import { cva, type VariantProps } from "class-variance-authority";
import { type ButtonHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 font-medium transition-[transform,background-color,color,opacity,border-color] duration-150 ease-out select-none disabled:pointer-events-none disabled:opacity-45 active:not-disabled:scale-[0.96]",
  {
    variants: {
      variant: {
        primary:
          "bg-accent text-accent-fg shadow-soft hover:brightness-[1.04]",
        secondary:
          "bg-surface text-ink border border-line hover:bg-wash",
        ghost: "bg-transparent text-ink hover:bg-wash",
        danger: "bg-bad text-accent-fg hover:brightness-110",
      },
      size: {
        sm: "h-10 rounded-sm px-3.5 text-sm",
        md: "h-12 rounded-md px-5 text-base",
        lg: "h-14 rounded-lg px-6 text-lg",
        xl: "h-16 rounded-xl px-8 text-xl",
        pad: "h-16 min-w-16 rounded-md text-2xl font-display",
      },
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
    },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  ),
);
Button.displayName = "Button";

export { buttonVariants };
