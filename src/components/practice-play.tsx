import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Lightbulb } from "lucide-react";
import { FootballPitch } from "@/components/flight-track";
import { MascotScene } from "@/components/mascot-scene";
import { NumberPad } from "@/components/number-pad";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { usePlayer } from "@/lib/game/store";
import { planetAt } from "@/lib/game/worlds";
import { factAnswer, factOp, formatAnswer } from "@/lib/game/types";
import {
  PRACTICE_LENGTH,
  equationText,
  explainFact,
  practiceDeck,
  practiceReducer,
  startPractice,
  type PracticeAction,
  type PracticeState,
} from "@/lib/game/learning";
import { cn } from "@/lib/utils";

export function PracticePlay() {
  const hydrated = usePlayer((s) => s.hydrated);
  const snapshot = usePlayer((s) => s.snapshot);
  const selectedPlanet = usePlayer((s) => s.selectedPlanet);
  const rankId = planetAt(selectedPlanet).rankId;
  const [session, setSession] = useState<PracticeState | null>(null);
  const dispatch = (action: PracticeAction) =>
    setSession((s) => (s ? practiceReducer(s, action) : s));
  const begin = () => setSession(startPractice(practiceDeck(snapshot(), rankId)));

  useEffect(() => {
    if (session?.phase !== "answer") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (/^[0-9,.]$/.test(e.key)) {
        e.preventDefault();
        dispatch({ type: "digit", digit: e.key === "." ? "," : e.key });
      } else if (e.key === "Backspace") {
        e.preventDefault();
        dispatch({ type: "back" });
      } else if (e.key === "Enter" && !(e.target instanceof HTMLButtonElement)) {
        e.preventDefault();
        dispatch({ type: "submit" });
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [session?.phase]);

  if (!session || session.phase === "done") {
    const done = session?.phase === "done";
    return (
      <div className="paper-grid flex min-h-dvh flex-col items-center justify-center px-4 py-8 text-center">
        <MascotScene mood={done ? "win" : "guide"} className="nico-scene-ready" priority />
        <p className="mt-4 text-sm font-medium text-accent">
          Centro de treinamento · sem cronômetro
        </p>
        <h1 className="mt-2 text-title">{done ? "Treinamos juntos!" : "Treinar com Nico"}</h1>
        <p className="mt-3 max-w-sm text-muted">
          {done
            ? "Cinco jogadas resolvidas, no seu ritmo. Pode encerrar por aqui."
            : "Cinco contas da sua etapa. Vou dar preferência às que pedem mais treino e explicar quando você precisar."}
        </p>
        <p className="mt-2 max-w-sm text-sm text-muted">
          Este treino não altera XP, estrelas, meta diária nem prêmio. Ao sair, ele recomeça.
        </p>
        {!done ? (
          <Button disabled={!hydrated} size="lg" className="mt-6 w-full max-w-sm" onClick={begin}>
            Começar treino
          </Button>
        ) : null}
        <Link
          to="/"
          className={cn(
            buttonVariants({ variant: "secondary" }),
            "mt-3 w-full max-w-sm no-underline",
          )}
        >
          Voltar ao campeonato
        </Link>
      </div>
    );
  }

  const fact = session.deck[session.index];
  const explanation = explainFact(fact);
  const isHelp = session.phase === "explain";
  const isCorrect = session.phase === "correct";
  const completed = session.index + (isCorrect ? 1 : 0);

  return (
    <div className="paper-grid min-h-dvh">
      <div className="mission-layout practice-layout mx-auto w-full max-w-5xl" data-help={isHelp}>
        <section className="safe-top flex flex-col px-4 pb-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              aria-label="Sair do treino"
              className={cn(buttonVariants({ variant: "secondary" }), "w-12 shrink-0 px-0")}
            >
              <ArrowLeft className="size-5" />
            </Link>
            <div>
              <h1 className="text-lg">Treinar com Nico</h1>
              <p className="text-sm text-muted">Sem cronômetro · no seu ritmo</p>
            </div>
          </div>
          <FootballPitch
            correct={completed}
            combo={0}
            feedback={isCorrect ? "ok" : isHelp ? "bad" : "none"}
            practiceTotal={PRACTICE_LENGTH}
          />
          <div className="mission-question flex flex-col items-center justify-center py-3">
            <p className="mb-2 text-sm text-muted">
              {factOp(fact) === "div" ? "Divisão" : "Multiplicação"} · jogada {session.index + 1} de{" "}
              {session.deck.length}
            </p>
            <div
              className="flex flex-wrap items-baseline justify-center gap-x-3 gap-y-1 font-display tabular-nums"
              aria-live="polite"
              aria-atomic="true"
            >
              <p
                data-equation
                className={cn(
                  "mission-equation whitespace-nowrap",
                  isCorrect ? "text-ok" : "text-ink",
                )}
              >
                {equationText(fact)}
              </p>
              <p data-answer className="whitespace-nowrap text-4xl text-ink">
                = {isHelp ? "?" : session.typed || "?"}
              </p>
            </div>
          </div>
        </section>

        <section className="mission-keyboard safe-bottom flex flex-col justify-center bg-surface/80 px-4 pt-4 sm:px-6 lg:border-l lg:border-line">
          {isHelp ? (
            <Card className="p-4" role="region" aria-labelledby="explanation-title">
              <p className="text-sm font-medium text-accent">Nico explica a jogada</p>
              <h2 id="explanation-title" className="mt-1 text-xl">
                {explanation.title}
              </h2>
              <p className="mt-3 text-sm text-muted">{explanation.intro}</p>
              <ol className="mt-4 grid gap-2">
                {explanation.parts.map((part, i) => (
                  <li key={i} className="rounded-sm border border-line bg-wash px-3 py-2">
                    <span className="text-xs text-muted">Passo {i + 1}</span>
                    <p className="font-display text-xl tabular-nums">
                      {equationText(part)} = {formatAnswer(factAnswer(part))}
                    </p>
                  </li>
                ))}
              </ol>
              <p className="mt-3 font-display text-xl text-accent">{explanation.conclusion}</p>
              <p className="mt-2 text-xs text-muted">
                Leia com calma. A explicação só sai quando você continuar.
              </p>
              <Button className="mt-4 w-full" onClick={() => dispatch({ type: "retry" })}>
                Entendi, vou tentar
              </Button>
            </Card>
          ) : isCorrect ? (
            <Card className="p-4" role="status">
              <h2 className="text-xl">Passe certeiro!</h2>
              <p className="mt-2 text-sm text-muted">
                {session.assisted
                  ? "Você usou a estratégia. Vamos experimentar uma conta parecida?"
                  : "Boa jogada. Você escolhe quando continuar."}
              </p>
              <Button className="mt-4 w-full" onClick={() => dispatch({ type: "next", rankId })}>
                {completed === session.deck.length ? "Concluir treino" : "Próxima jogada"}
              </Button>
            </Card>
          ) : (
            <>
              <Button
                variant="secondary"
                className="mb-3 w-full"
                onClick={() => dispatch({ type: "help" })}
              >
                <Lightbulb className="size-4" /> Me ensina, Nico
              </Button>
              <NumberPad
                onDigit={(digit) => dispatch({ type: "digit", digit })}
                onBack={() => dispatch({ type: "back" })}
                onSubmit={() => dispatch({ type: "submit" })}
              />
            </>
          )}
        </section>
      </div>
    </div>
  );
}
