import { cn } from "@/lib/utils";
import { cosmeticItem } from "@/lib/game/wardrobe";
import { useCosmetics } from "@/components/use-cosmetics";

/** A shared, transparent game prop; its contact shadow belongs to the ground. */
export function FootballBall({ className, itemId }: { className?: string; itemId?: string }) {
  const equipped = useCosmetics();
  const item = cosmeticItem(itemId ?? equipped.ballId);
  const ball = item?.kind === "ball" ? item : cosmeticItem("ball-classic")!;
  return (
    <span className={cn("football-ball", className)} aria-hidden="true">
      <img
        src={ball.art}
        data-ball-id={ball.id}
        alt=""
        width={384}
        height={384}
        draggable={false}
      />
    </span>
  );
}
