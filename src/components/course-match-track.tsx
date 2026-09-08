import { Check } from "lucide-react";

export function CourseMatchTrack({
  matches,
  completed,
  currentId,
}: {
  matches: readonly { id: string; name: string }[];
  completed: readonly string[];
  currentId: string;
}) {
  return (
    <ol className="course-match-track" aria-label="Partidas deste campeonato">
      {matches.map((match, index) => {
        const done = completed.includes(match.id);
        const current = match.id === currentId;
        return (
          <li
            key={match.id}
            data-completed={done}
            data-current={current}
            aria-current={current ? "step" : undefined}
          >
            <span className="course-match-position" aria-hidden="true">
              {done ? <Check /> : index + 1}
            </span>
            <span className="course-match-name" aria-hidden="true">
              {match.name}
            </span>
            <span className="sr-only">
              {match.name}, partida {index + 1} de {matches.length},{" "}
              {done ? "concluída" : current ? "próxima partida" : "conclua a anterior"}.
            </span>
          </li>
        );
      })}
    </ol>
  );
}
