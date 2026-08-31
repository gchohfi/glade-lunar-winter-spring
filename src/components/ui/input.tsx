import { type InputHTMLAttributes, forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        "h-12 w-full rounded-md border border-line bg-surface px-4 text-base text-ink placeholder:text-faint",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";
