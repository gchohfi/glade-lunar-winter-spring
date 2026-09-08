import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Clock, Coins, Pause, Trophy } from "lucide-react";
import { AppShell } from "./app-shell";
import { CourseConnectionGate } from "./course-connection-gate";
import { FieldScene } from "./field-scene";
import { NumberPad } from "./number-pad";
import { Button, buttonVariants } from "./ui/button";
import { useCourseSync, rememberAnswerTime } from "@/lib/game/connected-store";
import { courseMatch, nextCourseMatch, normalizeCourse, CHAMPIONSHIPS } from "@/lib/game/course";
import { equationText, explainFact } from "@/lib/game/learning";
import { emptyState, formatClock, parseGuess, formatAnswer, factKey } from "@/lib/game/types";
import { playCorrect, playWrong, playWin, unlockAudio } from "@/lib/game/audio";
import type { CourseCommand, ShotDirection } from "@/lib/game/course-types";

export function MissionPlay() {
  const sync = useCourseSync();
  const navigate = useNavigate();
  const state = sync.envelope?.state ?? emptyState();
  const attempt = sync.envelope?.activeAttempt;
  const course = normalizeCourse(state);
  const match =
    courseMatch(attempt?.matchId ?? course.lastResult?.matchId ?? course.selectedMatchId) ??
    nextCourseMatch(state);
  const cup = CHAMPIONSHIPS.find((c) => c.id === match.championshipId)!;
  const result = !attempt ? course.lastResult : null;
  const [typed, setTyped] = useState("");
  const [localPaused, setLocalPaused] = useState(true);
  const [elapsed, setElapsed] = useState(0);
  const [shot, setShot] = useState<ShotDirection | null>(null);
  const segment = useRef(0);
  const segmentStart = useRef<number | null>(null);
  const [notice, setNotice] = useState("");
  const owned = Boolean(attempt && attempt.ownerDeviceId === sync.deviceId);
  const ready = sync.status === "ready" && !sync.legacyAvailable;
  const answering = Boolean(
    ready && owned && !sync.busy && !localPaused && !shot && attempt?.phase === "answer",
  );

  const consumeTime = useCallback(() => {
    if (segmentStart.current !== null)
      segment.current = Math.max(segment.current, performance.now() - segmentStart.current);
    const current = useCourseSync.getState().envelope?.activeAttempt;
    const remaining = current ? current.timeLimitMs - current.mathElapsedMs : 0;
    const ms = Math.min(remaining, Math.max(0, Math.round(segment.current)));
    segmentStart.current = null;
    segment.current = 0;
    setElapsed(0);
    return ms;
  }, []);

  const act = useCallback(async (command: CourseCommand) => {
    setNotice("");
    const response = await useCourseSync.getState().send(command);
    if (response?.status === "conflict" || response?.status === "rejected") setLocalPaused(true);
    return response;
  }, []);

  // Only visible, independent response time runs. Every segment is journaled locally
  // and checkpointed to the account; pending commands retain their operation id.
  useEffect(() => {
    if (!answering || !attempt || !sync.envelope) return;
    segmentStart.current = performance.now();
    let raf = 0;
    let lastJournal = 0;
    const tick = (now: number) => {
      if (segmentStart.current === null) return;
      segment.current = now - segmentStart.current;
      setElapsed(segment.current);
      if (now - lastJournal > 100) {
        if (!rememberAnswerTime(attempt.id, sync.envelope!.revision, Math.round(segment.current))) {
          setLocalPaused(true);
          setNotice("Leitura pausada: não conseguimos guardar a interrupção neste aparelho.");
          return;
        }
        lastJournal = now;
      }
      const remaining = attempt.timeLimitMs - attempt.mathElapsedMs - segment.current;
      if (remaining <= 0 || segment.current >= 2000) {
        const elapsedMs = consumeTime();
        void act({
          type: remaining <= 0 ? "expire" : "checkpoint",
          attemptId: attempt.id,
          elapsedMs,
        });
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      if (segmentStart.current !== null) {
        const spent = performance.now() - segmentStart.current;
        segment.current = spent;
        rememberAnswerTime(attempt.id, sync.envelope!.revision, Math.round(spent));
        segmentStart.current = null;
      }
    };
  }, [answering, attempt, sync.envelope, act, consumeTime]);

  const pause = useCallback(async () => {
    const current = useCourseSync.getState().envelope?.activeAttempt;
    setLocalPaused(true);
    if (!current || current.ownerDeviceId !== useCourseSync.getState().deviceId) return;
    if (current.phase === "paused") return;
    const elapsedMs = consumeTime();
    rememberAnswerTime(current.id, useCourseSync.getState().envelope!.revision, elapsedMs);
    if (useCourseSync.getState().status === "ready" && !useCourseSync.getState().busy)
      await act({ type: "pause", attemptId: current.id, elapsedMs });
  }, [act, consumeTime]);

  useEffect(() => {
    const hide = () => {
      if (document.hidden) void pause();
    };
    const leave = () => {
      void pause();
    };
    document.addEventListener("visibilitychange", hide);
    window.addEventListener("pagehide", leave);
    return () => {
      document.removeEventListener("visibilitychange", hide);
      window.removeEventListener("pagehide", leave);
    };
  }, [pause]);

  useEffect(() => {
    if (sync.status !== "ready") setLocalPaused(true);
  }, [sync.status]);
  const currentFactKey = attempt?.fact ? factKey(attempt.fact) : null;
  useEffect(() => {
    setTyped("");
  }, [attempt?.id, currentFactKey, attempt?.feedback]);
  useEffect(() => {
    if (!shot) return;
    const id = window.setTimeout(() => setShot(null), 800);
    return () => window.clearTimeout(id);
  }, [shot]);

  const submit = useCallback(async () => {
    if (!answering || !attempt || !Number.isFinite(parseGuess(typed))) return;
    const response = await act({
      type: "answer",
      attemptId: attempt.id,
      guess: parseGuess(typed),
      elapsedMs: consumeTime(),
    });
    if (response?.activeAttempt?.feedback === "correct") playCorrect();
    else if (response?.activeAttempt?.feedback === "incorrect") playWrong();
  }, [answering, attempt, typed, act, consumeTime]);
  const digit = useCallback(
    (value: string) => {
      if (!answering) return;
      setTyped((previous) =>
        previous.length >= 6 || (value === "," && previous.includes(","))
          ? previous
          : previous + value,
      );
    },
    [answering],
  );
  useEffect(() => {
    const key = (event: KeyboardEvent) => {
      if (
        !answering ||
        event.ctrlKey ||
        event.metaKey ||
        event.altKey ||
        event.target instanceof HTMLInputElement
      )
        return;
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault();
        digit(event.key);
      } else if (event.key === "," || event.key === ".") {
        event.preventDefault();
        digit(",");
      } else if (event.key === "Backspace") {
        event.preventDefault();
        setTyped((v) => v.slice(0, -1));
      } else if (event.key === "Enter" && !(event.target instanceof HTMLButtonElement)) {
        event.preventDefault();
        void submit();
      } else if (event.key === "Escape") {
        event.preventDefault();
        void pause();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [answering, digit, submit, pause]);

  const startOrResume = async () => {
    unlockAudio();
    // Reset before the server reply can mount a new answering segment. In a retry,
    // localPaused may already be false; resetting afterwards would stop its RAF.
    consumeTime();
    setLocalPaused(true);
    const response = await act(
      attempt
        ? { type: "resume", attemptId: attempt.id, takeover: !owned }
        : { type: "start", matchId: match.id },
    );
    if (response?.status === "applied" || response?.status === "duplicate") {
      setLocalPaused(false);
    }
  };
  const kick = async (direction: ShotDirection) => {
    if (!attempt || sync.busy) return;
    setShot(direction);
    const response = await act({ type: "shoot", attemptId: attempt.id, direction });
    if (response?.status === "applied" || response?.status === "duplicate") playWin();
    else setShot(null);
  };
  const explanation =
    attempt?.feedback && attempt.feedback !== "correct" ? explainFact(attempt.fact) : null;
  const remaining = attempt
    ? Math.max(0, attempt.timeLimitMs - attempt.mathElapsedMs - elapsed)
    : course.durationSec * 1000;

  return (
    <AppShell
      compact
      right={
        <Button
          variant="ghost"
          disabled={sync.busy}
          onClick={async () => {
            await pause();
            await navigate({ to: "/" });
          }}
        >
          <ArrowLeft className="size-4" /> Sair e guardar
        </Button>
      }
    >
      <CourseConnectionGate />
      {ready ? (
        <div className="course-game">
          <header className="course-game-heading">
            <p className="course-eyebrow">
              {cup.name} · Partida {(match.index % 5) + 1} de 5
            </p>
            <h1>{match.name}</h1>
            <p>{match.theme}</p>
          </header>
          {result ? (
            <section className="course-result" aria-live="polite">
              <FieldScene feedback={result.passed ? "ok" : "none"} goal={result.passed} />
              <h2>
                {result.passed ? "Cinco gols. Partida concluída!" : "O tempo das contas terminou"}
              </h2>
              <p>
                {result.passed
                  ? "Seu avanço está confirmado. A revisão continua nas próximas partidas."
                  : "Vamos tentar de novo com ajuda nas contas difíceis. Suas conquistas anteriores continuam aqui."}
              </p>
              <div className="course-result-score">
                <Trophy aria-hidden="true" /> {result.goals} {result.goals === 1 ? "gol" : "gols"}
                {" · "}
                {result.correct} {result.correct === 1 ? "acerto" : "acertos"}
              </div>
              {result.learning ? (
                <p>
                  Você resolveu {result.learning.independentCorrect}{" "}
                  {result.learning.independentCorrect === 1 ? "conta" : "contas"} de primeira nesta
                  partida, sem ajuda.
                </p>
              ) : null}
              <p className="course-result-reward">
                <Coins aria-hidden="true" />{" "}
                {result.coinsGained
                  ? `+${result.coinsGained} moedas recebidas`
                  : result.passed
                    ? "Sem moedas extras nesta partida. A recompensa do dia já foi registrada."
                    : "Esta tentativa não liberou a próxima partida nem concedeu moedas."}
              </p>
              {result.passed ? (
                <Link to="/" className={buttonVariants({})}>
                  Ver meu campeonato
                </Link>
              ) : (
                <Button disabled={sync.busy} onClick={() => void startOrResume()}>
                  Tentar novamente
                </Button>
              )}
              <Link
                to={result.passed ? "/vestiario" : "/"}
                className={buttonVariants({ variant: "ghost" })}
              >
                {result.passed ? "Ir ao Vestiário" : "Voltar ao campeonato"}
              </Link>
            </section>
          ) : (
            <>
              <div className="course-scoreboard">
                <span>
                  <Trophy aria-hidden="true" />
                  <strong>{attempt?.goals ?? 0}/5</strong> gols
                </span>
                <span>{attempt?.correct ?? 0}/15 acertos</span>
                <span aria-label={`Tempo para responder: ${formatClock(remaining)}`}>
                  <Clock aria-hidden="true" />
                  <strong>{formatClock(remaining)}</strong>
                </span>
              </div>
              <div className="course-field" data-shot={shot ?? undefined}>
                <FieldScene
                  ballStep={attempt ? attempt.correct % 3 : 0}
                  feedback={shot ? "ok" : "none"}
                  goal={Boolean(shot)}
                />
              </div>
              {!attempt || localPaused || !owned || attempt.phase === "paused" ? (
                <section className="course-game-card">
                  <h2>
                    {!attempt
                      ? "Vamos entrar em campo?"
                      : !owned
                        ? "Sua partida está em outro aparelho"
                        : "Seu jogo está guardado"}
                  </h2>
                  <p>
                    {!attempt
                      ? "A cada três acertos, escolha onde chutar. Todos os chutes viram gol. O relógio só conta enquanto você responde."
                      : "Continue com os mesmos gols e o tempo restante. Ajuda e chutes não gastam o relógio."}
                  </p>
                  <Button size="lg" disabled={sync.busy} onClick={() => void startOrResume()}>
                    {!attempt ? "Começar partida" : !owned ? "Continuar aqui" : "Retomar partida"}
                  </Button>
                </section>
              ) : attempt.phase === "shot" || shot ? (
                <section className="course-game-card course-shot-choice" aria-live="polite">
                  <h2>{shot ? "Gooool!" : "Seu gol está conquistado!"}</h2>
                  <p>
                    {shot
                      ? "Bela jogada com o Nico."
                      : "Escolha o canto. Não tem como perder este gol."}
                  </p>
                  <div>
                    {(
                      [
                        ["left", "Esquerda"],
                        ["center", "Centro"],
                        ["right", "Direita"],
                      ] as const
                    ).map(([direction, label]) => (
                      <Button
                        key={direction}
                        disabled={sync.busy || Boolean(shot)}
                        onClick={() => void kick(direction)}
                      >
                        {label}
                      </Button>
                    ))}
                  </div>
                  <small>Relógio pausado</small>
                </section>
              ) : attempt.phase === "feedback" ? (
                <section className="course-game-card course-feedback" aria-live="polite">
                  <h2>{explanation ? explanation.title : "Bom passe!"}</h2>
                  {explanation ? (
                    <>
                      <p>{explanation.intro}</p>
                      <div className="course-explanation">
                        {explanation.parts.map((f, i) => (
                          <p key={i}>
                            {equationText(f)} ={" "}
                            {formatAnswer(f.op === "div" ? f.a / f.b : f.a * f.b)}
                          </p>
                        ))}
                        <strong>{explanation.conclusion}</strong>
                      </div>
                      <p>Seu gol não foi retirado. Vamos usar essa ideia na próxima resposta.</p>
                    </>
                  ) : (
                    <p>
                      {attempt.correct % 3 === 0
                        ? "Três acertos! Agora é hora do chute."
                        : `Faltam ${3 - (attempt.correct % 3)} acertos para o próximo gol.`}
                    </p>
                  )}
                  <Button
                    disabled={sync.busy}
                    onClick={() => void act({ type: "continue", attemptId: attempt.id })}
                  >
                    {attempt.feedback === "help" ? "Entendi · vou tentar" : "Continuar"}
                  </Button>
                  <small>Relógio pausado</small>
                </section>
              ) : (
                <section className="course-answer-card" aria-labelledby="course-equation">
                  <p className="course-eyebrow">Resolva para avançar a bola</p>
                  <h2
                    id="course-equation"
                    data-equation
                    className="mission-equation course-equation"
                  >
                    {equationText(attempt.fact)} <span>=</span>{" "}
                    <output data-answer aria-label="Sua resposta">
                      {typed || "?"}
                    </output>
                  </h2>
                  <NumberPad
                    disabled={!answering}
                    onDigit={digit}
                    onBack={() => setTyped((v) => v.slice(0, -1))}
                    onSubmit={() => void submit()}
                  />
                  <div className="course-answer-tools">
                    <Button
                      variant="ghost"
                      disabled={sync.busy}
                      onClick={() =>
                        void act({ type: "help", attemptId: attempt.id, elapsedMs: consumeTime() })
                      }
                    >
                      Nico, me ajuda
                    </Button>
                    <Button variant="ghost" disabled={sync.busy} onClick={() => void pause()}>
                      <Pause className="size-4" /> Pausar
                    </Button>
                  </div>
                </section>
              )}
              <p className="course-action-status" role="status">
                {notice}
              </p>
            </>
          )}
        </div>
      ) : null}
    </AppShell>
  );
}
