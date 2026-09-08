import { useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowRight, Check, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { MascotScene } from "@/components/mascot-scene";
import { CourseConnectionGate } from "@/components/course-connection-gate";
import { CourseMatchTrack } from "@/components/course-match-track";
import { NicoIntro } from "@/components/nico-intro";
import { Button, buttonVariants } from "@/components/ui/button";
import { useGameDate } from "@/components/use-game-date";
import {
  CHAMPIONSHIPS,
  COURSE_MATCHES,
  courseMatch,
  nextCourseMatch,
  normalizeCourse,
} from "@/lib/game/course";
import { useCourseSync } from "@/lib/game/connected-store";
import { usePlayer } from "@/lib/game/store";
import { displayName, todayKey } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function HomeDashboard() {
  const player = usePlayer();
  const sync = useCourseSync();
  const date = useGameDate();
  const navigate = useNavigate();
  const [message, setMessage] = useState("");
  const homeActionRef = useRef<HTMLButtonElement>(null);
  const course = normalizeCourse(player);
  const active = sync.envelope?.activeAttempt;
  const match = (active && courseMatch(active.matchId)) || nextCourseMatch(player);
  const cup = CHAMPIONSHIPS.find((candidate) => candidate.id === match.championshipId)!;
  const matches = COURSE_MATCHES.filter((candidate) => candidate.championshipId === cup.id);
  const completedAll = COURSE_MATCHES.every((candidate) =>
    course.completedMatches.includes(candidate.id),
  );
  const playedToday = (course.rewardDays[todayKey(date)] ?? 0) > 0;
  const ready = sync.status === "ready" && !sync.legacyAvailable;
  const play = async () => {
    setMessage("");
    if (!ready || sync.busy) return;
    if (active) {
      await navigate({ to: "/play" });
      return;
    }
    const result = await sync.send({ type: "select", matchId: match.id });
    if (result && (result.status === "applied" || result.status === "duplicate")) {
      await navigate({ to: "/play" });
    } else setMessage(result?.message ?? "Não foi possível abrir a partida. Tente novamente.");
  };

  return (
    <AppShell
      compact
      right={
        <Link to="/pais" className="course-parent-link">
          Pais
        </Link>
      }
    >
      {!ready ? (
        <CourseConnectionGate />
      ) : (
        <div className="course-home">
          <CourseConnectionGate />
          <p className="course-greeting">Bom te ver, {displayName(player)}.</p>
          <section className="course-home-card" aria-labelledby="course-home-title">
            <div className="course-home-copy">
              <p className="course-eyebrow">
                <Trophy className="size-4" aria-hidden="true" />
                {completedAll
                  ? "Suas quatro copas estão concluídas"
                  : `Campeonato ${CHAMPIONSHIPS.indexOf(cup) + 1} de ${CHAMPIONSHIPS.length}`}
              </p>
              <h1 id="course-home-title">
                {completedAll && !active ? "Revisão da Copa do Nico" : cup.name}
              </h1>
              <p className="course-cup-description">
                {completedAll && !active
                  ? "Vamos fortalecer suas jogadas. Seus troféus continuam aqui."
                  : cup.description}
              </p>
              <CourseMatchTrack
                matches={matches}
                completed={course.completedMatches}
                currentId={match.id}
              />
              <div className="course-next-match">
                <p className="course-eyebrow">
                  {active
                    ? "Sua partida está guardada"
                    : completedAll
                      ? "Próxima partida · revisão"
                      : `Próxima partida · ${(match.index % 5) + 1} de 5`}
                </p>
                <h2>{completedAll && !active ? "Reencontrar o que você aprendeu" : match.name}</h2>
                <p>{match.theme}</p>
              </div>
              {active ? (
                <p className="course-play-rule">
                  {active.correct} acertos e {active.goals} gols. Continue de onde parou.
                </p>
              ) : (
                <p className="course-play-rule">
                  15 acertos fazem 5 gols. O Nico ajuda quando precisar.
                </p>
              )}
              <Button
                ref={homeActionRef}
                size="lg"
                variant={playedToday && !active ? "secondary" : "primary"}
                className="course-home-cta"
                onClick={() => void play()}
                disabled={sync.busy}
              >
                {sync.busy
                  ? "Abrindo partida…"
                  : active
                    ? "Continuar partida"
                    : playedToday
                      ? "Jogar mais, se quiser"
                      : "Jogar próxima partida"}
                <ArrowRight className="size-5" aria-hidden="true" />
              </Button>
              {playedToday && !active ? (
                <p className="course-rest-note">
                  <Check className="size-4" aria-hidden="true" />
                  Bom jogo hoje! Pode parar por aqui e voltar quando quiser.
                </p>
              ) : (
                <p className="course-rest-note">
                  Uma partida de cada vez. Sem perder o que já conquistou.
                </p>
              )}
              <p className="course-action-status" role="status" aria-live="polite">
                {message || (sync.busy ? "Aguardando confirmação…" : "")}
              </p>
            </div>
            <div className="course-home-field">
              <MascotScene
                mood={completedAll ? "win" : "guide"}
                className="course-home-scene"
                priority
              />
              <p>Nico + você. No mesmo time.</p>
            </div>
          </section>
          <nav className="course-home-links" aria-label="Outros espaços do jogo">
            <Link
              to="/campeonatos"
              className={cn(buttonVariants({ variant: "ghost" }), "no-underline")}
            >
              Campeonatos
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <Link
              to="/vestiario"
              className={cn(buttonVariants({ variant: "ghost" }), "no-underline")}
            >
              Vestiário
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </nav>
          {sync.accountId && (
            <NicoIntro
              key={sync.accountId}
              accountId={sync.accountId}
              soundEnabled={player.sound}
              homeActionRef={homeActionRef}
            />
          )}
        </div>
      )}
    </AppShell>
  );
}
