import { cn } from "@/lib/utils";

/** A shared, transparent game prop; its contact shadow belongs to the ground. */
export function FootballBall({ className }: { className?: string }) {
  return (
    <span className={cn("football-ball", className)} aria-hidden="true">
      <img src="/game/football/ball-v2.webp" alt="" width={256} height={256} draggable={false} />
    </span>
  );
}
