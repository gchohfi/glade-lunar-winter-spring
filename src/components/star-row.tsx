import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function StarRow({
  value,
  max = 3,
  size = "md",
}: {
  value: number;
  max?: number;
  size?: "sm" | "md";
}) {
  const dim = size === "sm" ? "size-3.5" : "size-5";
  return (
    <div className="flex items-center justify-center gap-1" aria-label={`${value} de ${max} estrelas`}>
      {Array.from({ length: max }, (_, i) => (
        <Star
          key={i}
          className={cn(dim, i < value ? "fill-accent text-accent" : "text-faint")}
          strokeWidth={2}
        />
      ))}
    </div>
  );
}
