import { Mascot, type MascotMood } from "@/components/mascot";
import { STADIUM_ART } from "@/lib/game/worlds";
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
  return (
    <div className={cn("nico-scene", className)}>
      <img
        className="nico-stadium"
        src={STADIUM_ART}
        alt=""
        draggable={false}
        loading={priority ? "eager" : "lazy"}
      />
      <div className="nico-scene-ground" aria-hidden="true" />
      <Mascot mood={mood} className="nico-scene-lion" priority={priority} />
      <span className="football-ball nico-scene-ball" aria-hidden="true">
        ⚽
      </span>
    </div>
  );
}
