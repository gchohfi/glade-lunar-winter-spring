import { dayMet, weekStrip } from "@/lib/game/daily";
import type { PlayerState } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function WeekStrip({ days }: { days: PlayerState["days"] }) {
  const week = weekStrip();
  return (
    <div className="grid grid-cols-7 gap-1.5" aria-label="Semana de treino">
      {week.map((day) => {
        const met = dayMet(days[day.key]);
        return (
          <div key={day.key} className="text-center">
            <p className={cn("text-xs", day.isToday ? "font-medium text-ink" : "text-faint")}>
              {day.label}
            </p>
            <div
              className={cn(
                "mx-auto mt-1 size-7 rounded-full border",
                met
                  ? "border-accent bg-accent"
                  : day.isToday
                    ? "border-accent/40 bg-wash"
                    : "border-line bg-surface",
              )}
            />
          </div>
        );
      })}
    </div>
  );
}
