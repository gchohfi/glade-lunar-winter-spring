import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Check, ChevronDown, Lock, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { CourseConnectionGate } from "@/components/course-connection-gate";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  CHAMPIONSHIPS,
  COURSE_MATCHES,
  courseMatchUnlocked,
  nextCourseMatch,
  normalizeCourse,
} from "@/lib/game/course";
import { useCourseSync } from "@/lib/game/connected-store";
import { usePlayer } from "@/lib/game/store";
import { cn } from "@/lib/utils";

export function ChampionshipsPage() {
  const sync = useCourseSync();
  return (
    <AppShell
      compact
      right={
        <Link to="/" className={cn(buttonVariants({ variant: "ghost" }), "no-underline")}>
          <ArrowLeft className="size-4" />
          Meu campeonato
        </Link>
      }
    >
      <CourseConnectionGate />
      {sync.status === "ready" && !sync.legacyAvailable ? <ChampionshipsContent /> : null}
    </AppShell>
  );
}

function ChampionshipsContent() {
  const player = usePlayer();
  const sync = useCourseSync();
  const navigate = useNavigate();
  const next = nextCourseMatch(player);
  const course = normalizeCourse(player);
  const [expanded, setExpanded] = useState(next.championshipId);
  const [message, setMessage] = useState("");
  const active = sync.envelope?.activeAttempt;
  const play = async (matchId: string) => {
    setMessage("");
    if (sync.busy || !courseMatchUnlocked(player, matchId)) return;
    if (active) {
      if (active.matchId === matchId) await navigate({ to: "/play" });
      else
        setMessage("Uma partida já está em andamento. Continue esse jogo antes de escolher outro.");
      return;
    }
    const result = await sync.send({ type: "select", matchId });
    if (result && (result.status === "applied" || result.status === "duplicate"))
      await navigate({ to: "/play" });
    else
      setMessage(result?.message ?? "Não foi possível selecionar esta partida. Tente novamente.");
  };
  return (
    <div className="course-championships">
      <div className="course-page-heading">
        <p className="course-eyebrow">Um campeonato de cada vez</p>
        <h1>Seu caminho com Nico</h1>
        <p>Quatro copas. Cinco partidas em cada uma. A final abre o próximo campeonato.</p>
      </div>
      {active ? (
        <div className="course-resume-notice">
          <p>Você tem uma partida em andamento. Seus acertos estão guardados.</p>
          <Link to="/play" className={cn(buttonVariants({ variant: "secondary" }), "no-underline")}>
            Continuar partida
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
      ) : null}
      <div className="course-cup-list">
        {CHAMPIONSHIPS.map((cup, index) => {
          const matches = COURSE_MATCHES.filter((match) => match.championshipId === cup.id);
          const completed = matches.filter((match) =>
            course.completedMatches.includes(match.id),
          ).length;
          const unlocked = courseMatchUnlocked(player, matches[0].id);
          const open = expanded === cup.id;
          return (
            <section key={cup.id} className="course-cup-section" data-unlocked={unlocked}>
              <h2>
                <Button
                  variant="ghost"
                  className="course-cup-toggle"
                  aria-expanded={open}
                  aria-controls={`course-cup-${cup.id}`}
                  onClick={() => setExpanded(open ? "" : cup.id)}
                >
                  <span className="course-cup-number" aria-hidden="true">
                    {completed === 5 ? <Trophy /> : unlocked ? index + 1 : <Lock />}
                  </span>
                  <span>
                    <strong>{cup.name}</strong>
                    <small>
                      {completed === 5
                        ? "Copa concluída · pode jogar novamente"
                        : unlocked
                          ? `${completed} de 5 partidas concluídas`
                          : `Conclua a final da ${CHAMPIONSHIPS[index - 1]?.name ?? "copa anterior"}`}
                    </small>
                  </span>
                  <ChevronDown className="course-cup-chevron" aria-hidden="true" />
                </Button>
              </h2>
              {open ? (
                <div id={`course-cup-${cup.id}`} className="course-cup-content">
                  <p>{cup.description}</p>
                  <ol className="course-cup-matches">
                    {matches.map((match, position) => {
                      const done = course.completedMatches.includes(match.id);
                      const allowed = courseMatchUnlocked(player, match.id);
                      const inProgress = active?.matchId === match.id;
                      return (
                        <li key={match.id}>
                          <div className="course-cup-match-description">
                            <span
                              className="course-match-position"
                              data-completed={done}
                              aria-hidden="true"
                            >
                              {done ? <Check /> : position + 1}
                            </span>
                            <div>
                              <h3>{match.name}</h3>
                              <p>{match.theme}</p>
                              <small>
                                {inProgress
                                  ? "Em andamento"
                                  : done
                                    ? "Concluída"
                                    : allowed
                                      ? "Disponível para jogar"
                                      : "Conclua a partida anterior"}
                              </small>
                            </div>
                          </div>
                          <Button
                            variant={allowed && !done ? "primary" : "secondary"}
                            disabled={!allowed || sync.busy || Boolean(active && !inProgress)}
                            onClick={() => void play(match.id)}
                            aria-label={`${inProgress ? "Continuar" : done ? "Jogar novamente" : "Jogar"} ${match.name}, ${cup.name}`}
                          >
                            {!allowed ? (
                              <>
                                <Lock className="size-4" aria-hidden="true" />A liberar
                              </>
                            ) : inProgress ? (
                              "Continuar"
                            ) : done ? (
                              "Jogar de novo"
                            ) : (
                              "Jogar"
                            )}
                          </Button>
                        </li>
                      );
                    })}
                  </ol>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
      <p className="course-action-status" role="status" aria-live="polite">
        {message || (sync.busy ? "Abrindo a partida…" : "")}
      </p>
      <p className="course-page-note">
        Os troféus marcam seu caminho. Algumas contas voltam nas próximas partidas para você lembrar
        cada vez melhor.
      </p>
    </div>
  );
}
