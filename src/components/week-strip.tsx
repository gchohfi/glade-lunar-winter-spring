import { Check } from "lucide-react";
import { useGameDate } from "@/components/use-game-date";
import { dayMet, weekStrip } from "@/lib/game/daily";
import { TIMEZONE, type PlayerState } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function WeekStrip({ days }: { days: PlayerState["days"] }) {
  const date = useGameDate();
  const week = weekStrip(date);
  return (
    <div className="grid grid-cols-7 gap-1.5" aria-label="Semana de treino">
      {week.map((day) => {
        const met = dayMet(days[day.key]);
        const date = new Intl.DateTimeFormat("pt-BR", {
          timeZone: TIMEZONE,
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(new Date(`${day.key}T15:00:00Z`));
        const correct = days[day.key]?.correct ?? 0;
        const status = met
          ? "objetivo de 15 acertos atingido"
          : days[day.key]?.answered
            ? `${correct} acertos praticados`
            : "sem registro de treino";
        return (
          <div key={day.key} className="text-center" title={`${date}: ${status}`}>
            <span className="sr-only">
              {date}
              {day.isToday ? ", hoje" : ""}: {status}.
            </span>
            <p
              aria-hidden="true"
              className={cn("text-xs", day.isToday ? "font-medium text-ink" : "text-faint")}
            >
              {day.label}
            </p>
            <div
              className={cn(
                "mx-auto mt-1 flex size-7 items-center justify-center rounded-full border",
                met
                  ? "border-accent bg-accent text-accent-fg"
                  : day.isToday
                    ? "border-accent/40 bg-wash"
                    : "border-line bg-surface",
              )}
              aria-hidden="true"
            >
              {met ? <Check className="size-4" strokeWidth={2.5} /> : null}
            </div>
          </div>
        );
      })}
    </div>
  );
}
