import { Mascot, type MascotMood } from "@/components/mascot";
import { FootballBall } from "@/components/football-ball";
import { cosmeticItem } from "@/lib/game/wardrobe";
import { useCosmetics } from "@/components/use-cosmetics";
import { cn } from "@/lib/utils";

/** Shared ground, contact shadow and ball make Nico part of the field. */
export function MascotScene({
  mood = "idle",
  className,
  priority = false,
}: {
  mood?: MascotMood;
  className?: string;
  priority?: boolean;
}) {
  const equipped = useCosmetics();
  const field = cosmeticItem(equipped.fieldId)!;
  return (
    <div className={cn("nico-scene", className)}>
      <img
        className="nico-stadium"
        src={field.sceneArt ?? field.art}
        data-field-id={field.id}
        alt=""
        draggable={false}
        loading={priority ? "eager" : "lazy"}
      />
      <div className="nico-scene-ground" aria-hidden="true" />
      <Mascot mood={mood} className="nico-scene-lion" priority={priority} />
      <FootballBall className="nico-scene-ball" />
    </div>
  );
}
