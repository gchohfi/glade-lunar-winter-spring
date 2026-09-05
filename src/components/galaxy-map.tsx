import { Flag, Lock, Trophy } from "lucide-react";
import { CHAPTERS, PLANETS } from "@/lib/game/worlds";
import { formatClock } from "@/lib/game/types";
import { StarRow } from "@/components/star-row";
import { cn } from "@/lib/utils";

export function ChampionshipPath({
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
    <div className="space-y-4">
      {CHAPTERS.map((chapter, chapterIndex) => (
        <section key={chapter} aria-label={chapter}>
          <h3 className="mb-2 flex items-center gap-2 text-sm font-medium text-muted">
            <span className="inline-flex size-6 items-center justify-center rounded-full border border-line text-xs">
              {chapterIndex + 1}
            </span>
            {chapter}
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {PLANETS.map((stage, index) => {
              if (stage.chapter !== chapterIndex) return null;
              const locked = index > furthest;
              return (
                <button
                  key={stage.id}
                  type="button"
                  disabled={locked}
                  onClick={() => onSelect(index)}
                  aria-pressed={index === selected}
                  aria-label={stage.name + (locked ? ", bloqueada" : "")}
                  className={cn(
                    "flex min-h-24 items-center gap-3 rounded-md border p-3 text-left",
                    index === selected ? "border-accent bg-wash" : "border-line bg-surface",
                    locked && "opacity-60",
                  )}
                >
                  <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-bg text-accent">
                    {locked ? (
                      <Lock className="size-4" />
                    ) : chapterIndex === 4 ? (
                      <Trophy className="size-5" />
                    ) : (
                      <Flag className="size-5" />
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-display">{stage.name}</span>
                    <span className="mt-1 block">
                      <StarRow value={stars[index] ?? 0} size="sm" />
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {index === selected
                        ? "Etapa selecionada"
                        : locked
                          ? "Complete a etapa anterior"
                          : "Disponível para jogar"}
                      {(bestMs[index] ?? 0) > 0 ? " · " + formatClock(bestMs[index]) : ""}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
