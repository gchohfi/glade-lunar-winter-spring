import { Lock } from "lucide-react";
import { PLANETS } from "@/lib/game/worlds";
import { formatClock } from "@/lib/game/types";
import { StarRow } from "@/components/star-row";
import { cn } from "@/lib/utils";

export function GalaxyMap({
  selected,
  furthest,
  stars,
  bestMs,
  onSelect,
}: {
  selected: number;
  furthest: number;
  stars: number[];
  bestMs: number[];
  onSelect: (index: number) => void;
}) {
  return (
    <div className="relative">
      <div className="galaxy-scroll flex gap-3 overflow-x-auto pb-3 pt-1 snap-x snap-mandatory">
        {PLANETS.map((planet, index) => {
          const locked = index > furthest;
          const isOn = index === selected;
          return (
            <button
              key={planet.id}
              type="button"
              disabled={locked}
              onClick={() => onSelect(index)}
              className={cn(
                "snap-center shrink-0 w-36 rounded-xl border bg-surface p-3 text-left transition-transform duration-(--motion-fast) ease-(--ease-out)",
                isOn ? "border-accent shadow-soft" : "border-line",
                locked && "opacity-55",
              )}
            >
              <div className="relative">
                <img
                  src={planet.art}
                  alt=""
                  className="aspect-square w-full rounded-lg object-cover"
                  draggable={false}
                />
                {locked ? (
                  <span className="absolute inset-0 flex items-center justify-center rounded-lg bg-ink/25">
                    <Lock className="size-6 text-surface" strokeWidth={2} />
                  </span>
                ) : null}
              </div>
              <p className="mt-2 font-display text-sm leading-tight">{planet.name}</p>
              <p className="mt-0.5 text-xs text-muted">{index + 1}/{PLANETS.length}</p>
              <div className="mt-2">
                <StarRow value={stars[index] ?? 0} size="sm" />
              </div>
              <p className="mt-1 text-xs tabular-nums text-muted">
                {(bestMs[index] ?? 0) > 0 ? formatClock(bestMs[index]) : "—"}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
