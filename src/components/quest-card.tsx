import { Check, Circle } from "lucide-react";
import { Card } from "@/components/ui/card";
import { questsForDay, QUEST_XP } from "@/lib/game/quests";
import { usePlayer } from "@/lib/game/store";
import { cn } from "@/lib/utils";

export function QuestCard() {
  const player = usePlayer();
  const quests = questsForDay(player);
  const doneCount = quests.filter((q) => q.done).length;

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg">Missões do dia</h2>
        <span className="text-sm tabular-nums text-muted">
          {doneCount}/{quests.length}
        </span>
      </div>
      <ul className="mt-3 space-y-2.5">
        {quests.map((q) => (
          <li key={q.id} className="flex items-center gap-3">
            <span
              className={cn(
                "inline-flex size-7 shrink-0 items-center justify-center rounded-full",
                q.done
                  ? "bg-accent text-accent-fg"
                  : "border border-line text-faint",
              )}
            >
              {q.done ? (
                <Check className="size-4" strokeWidth={2.5} />
              ) : (
                <Circle className="size-3" strokeWidth={2} />
              )}
            </span>
            <span className={cn("min-w-0 flex-1 text-sm", q.done ? "text-muted" : "text-ink")}>
              {q.title}
            </span>
            {q.done ? (
              <span className="shrink-0 rounded-full bg-wash px-2 py-0.5 text-xs font-medium text-accent">
                +{QUEST_XP} XP
              </span>
            ) : (
              <span className="shrink-0 text-sm tabular-nums text-muted">
                {q.progress}/{q.target}
              </span>
            )}
          </li>
        ))}
      </ul>
      {doneCount === quests.length ? (
        <p className="mt-3 text-sm text-muted">As três de hoje. Amanhã tem novas.</p>
      ) : null}
    </Card>
  );
}
