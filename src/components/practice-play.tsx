import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { X } from "lucide-react";
import { NumberPad } from "@/components/number-pad";
import { persistCloud } from "@/components/cloud-sync";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { drawNext, recycleMiss } from "@/lib/game/adaptive";
import {
  playCorrect,
  playTap,
  playWin,
  playWrong,
  unlockAudio,
} from "@/lib/game/audio";
import {
  buildPracticeDeck,
  practiceTargets,
  PRACTICE_SIZE,
  type PracticeOutcome,
} from "@/lib/game/practice";
import { QUEST_XP } from "@/lib/game/quests";
import { xpToNext } from "@/lib/game/progress";
import { usePlayer } from "@/lib/game/store";
import { factKey, formatClock, type Fact } from "@/lib/game/types";
import { cn } from "@/lib/utils";

type Phase = "ready" | "running" | "done";
type Flash = "none" | "ok" | "bad";

export function PracticePlay() {
  const navigate = useNavigate();
  const snapshot = usePlayer((s) => s.snapshot);
  const applyPractice = usePlayer((s) => s.applyPractice);
  const level = usePlayer((s) => s.level);
  const xp = usePlayer((s) => s.xp);

  const [phase, setPhase] = useState<Phase>("ready");
  const [fact, setFact] = useState<Fact>({ a: 7, b: 8 });
  const [typed, setTyped] = useState("");
  const [correct, setCorrect] = useState(0);
  const [reveal, setReveal] = useState<number | null>(null);
  const [flash, setFlash] = useState<Flash>("none");
  const [flashKey, setFlashKey] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [finalMs, setFinalMs] = useState(0);
  const [outcome, setOutcome] = useState<PracticeOutcome | null>(null);

  // O servidor renderiza com o estado vazio; os alvos só existem no cliente.
  // O primeiro render do cliente precisa casar com o SSR (rotas lazy hidratam
  // depois que o CloudSync já leu o localStorage), então o que depende de
  // dados locais só entra depois de montado.
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const queueRef = useRef<Fact[]>([]);
  const factRef = useRef(fact);
  const typedRef = useRef("");
  const revealRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>(phase);
  const correctRef = useRef(0);
  const triedRef = useRef<Array<{ fact: Fact; ok: boolean; ms: number }>>([]);
  const startRef = useRef(0);
  const qStartRef = useRef(0);
  const endedRef = useRef(false);
  const revealTimer = useRef<number | null>(null);

  factRef.current = fact;
  typedRef.current = typed;
  revealRef.current = reveal;
  phaseRef.current = phase;
  correctRef.current = correct;

  const targets = practiceTargets(snapshot(), 3);

  useEffect(() => {
    if (phase !== "running") return;
    let raf = 0;
    const tick = (now: number) => {
      setElapsed(now - startRef.current);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const begin = () => {
    unlockAudio();
    endedRef.current = false;
    triedRef.current = [];
    const deck = buildPracticeDeck(snapshot());
    const first = deck[0] ?? { a: 7, b: 8 };
    queueRef.current = deck.slice(1);
    factRef.current = first;
    correctRef.current = 0;
    setFact(first);
    setTyped("");
    setCorrect(0);
    setReveal(null);
    setFlash("none");
    setOutcome(null);
    setElapsed(0);
    startRef.current = performance.now();
    qStartRef.current = performance.now();
    setPhase("running");
  };

  const finish = () => {
    if (endedRef.current) return;
    endedRef.current = true;
    setFinalMs(performance.now() - startRef.current);
    const result = applyPractice({ factsTried: triedRef.current });
    setOutcome(result);
    playWin();
    persistCloud();
    setPhase("done");
  };

  const goNext = (ok: boolean, missed?: Fact) => {
    qStartRef.current = performance.now();
    setTyped("");
    typedRef.current = "";
    setReveal(null);
    setFlash("none");
    if (!ok && missed) {
      queueRef.current = recycleMiss(queueRef.current, missed);
    }
    if (queueRef.current.length < 2) {
      const extra = buildPracticeDeck(snapshot()).filter(
        (f) => factKey(f) !== factKey(factRef.current),
      );
      queueRef.current = [...queueRef.current, ...extra];
    }
    const drawn = drawNext(queueRef.current, factRef.current);
    queueRef.current = drawn.queue;
    factRef.current = drawn.fact;
    setFact(drawn.fact);
  };

  const submit = (raw?: string) => {
    if (phaseRef.current !== "running" || revealRef.current !== null) return;
    const value = (raw ?? typedRef.current).trim();
    if (!value) return;
    const guess = Number(value);
    if (!Number.isFinite(guess)) return;
    const current = factRef.current;
    const answer = current.a * current.b;
    const ms = performance.now() - qStartRef.current;
    if (guess === answer) {
      triedRef.current.push({ fact: current, ok: true, ms });
      playCorrect();
      setFlash("ok");
      setFlashKey((k) => k + 1);
      correctRef.current += 1;
      setCorrect(correctRef.current);
      if (correctRef.current >= PRACTICE_SIZE) {
        window.setTimeout(finish, 320);
      } else {
        window.setTimeout(() => goNext(true), 220);
      }
    } else {
      triedRef.current.push({ fact: current, ok: false, ms });
      playWrong();
      setFlash("bad");
      setFlashKey((k) => k + 1);
      setReveal(answer);
      if (revealTimer.current) window.clearTimeout(revealTimer.current);
      revealTimer.current = window.setTimeout(() => goNext(false, current), 900);
    }
  };

  const onDigit = (d: string) => {
    if (phaseRef.current !== "running" || revealRef.current !== null) return;
    playTap();
    setTyped((prev) => {
      if (prev.length >= 3) return prev;
      const next = prev + d;
      typedRef.current = next;
      if (Number(next) === factRef.current.a * factRef.current.b) {
        window.setTimeout(() => submit(next), 40);
      }
      return next;
    });
  };

  const onBack = () => {
    if (phaseRef.current !== "running" || revealRef.current !== null) return;
    setTyped((p) => {
      const next = p.slice(0, -1);
      typedRef.current = next;
      return next;
    });
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phaseRef.current === "ready" && (e.key === "Enter" || e.key === " ")) {
        e.preventDefault();
        begin();
        return;
      }
      if (phaseRef.current !== "running") return;
      if (e.key >= "0" && e.key <= "9") {
        e.preventDefault();
        onDigit(e.key);
      } else if (e.key === "Backspace") {
        e.preventDefault();
        onBack();
      } else if (e.key === "Enter") {
        e.preventDefault();
        submit();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (phase === "ready") {
    return (
      <div className="paper-grid flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">
          Treino · sem relógio
        </p>
        <h1 className="mt-2 font-display text-title">Treino das teimosas</h1>
        <p className="mt-3 max-w-sm text-muted">
          Dez acertos, sem relógio correndo. Errou? A conta volta até sair
          redonda.
        </p>
        {mounted && targets.length > 0 ? (
          <p className="mt-3 font-display text-lg tabular-nums">
            {targets.map((t) => `${t.fact.a}×${t.fact.b}`).join(" · ")}
          </p>
        ) : null}
        <Button size="xl" className="mt-8 w-full max-w-sm" onClick={begin}>
          Começar
        </Button>
        <Link
          to="/"
          className="mt-4 text-sm font-medium text-muted no-underline hover:text-ink"
        >
          Voltar ao mapa
        </Link>
      </div>
    );
  }

  if (phase === "done") {
    const need = xpToNext(level);
    return (
      <div className="paper-grid flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
        <h1 className="font-display text-title">Treino feito.</h1>
        <p className="mt-2 max-w-sm text-muted">
          Dez acertos em {formatClock(finalMs)}. +{outcome?.xpGained ?? 0} XP.
        </p>
        {outcome?.dailyJustDone ? (
          <p className="mt-2 max-w-sm font-display text-accent">
            Missão de hoje cumprida. A sequência continua.
          </p>
        ) : null}
        {outcome?.shieldEarned ? (
          <p className="mt-1 max-w-sm text-sm font-medium text-accent">
            Escudo guardado. Um dia de folga não quebra mais a sequência.
          </p>
        ) : null}
        {(outcome?.questsCompleted ?? []).map((q) => (
          <p key={q.id} className="mt-1 max-w-sm text-sm font-medium text-accent">
            Missão do dia cumprida: {q.title}. +{QUEST_XP} XP
          </p>
        ))}
        <Card className="mt-5 w-full max-w-sm p-4 text-left">
          <p className="text-sm font-medium text-muted">Nível {level}</p>
          <Progress className="mt-2" value={xp} max={need} />
          <p className="mt-2 text-sm tabular-nums text-muted">
            {xp} / {need} XP
          </p>
        </Card>
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          <Button size="lg" className="w-full" onClick={begin}>
            De novo
          </Button>
          <Button
            variant="secondary"
            size="lg"
            className="w-full"
            onClick={() => navigate({ to: "/" })}
          >
            Mapa
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="paper-grid min-h-dvh">
      <div className="mx-auto mission-layout w-full max-w-5xl">
        <section className="safe-top flex flex-col px-4 pb-4 sm:px-6">
          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: "/" })}
              className="inline-flex size-11 items-center justify-center rounded-md border border-line bg-surface text-muted"
              aria-label="Sair do treino"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
            <div className="flex flex-col items-center">
              <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">
                Treino · sem relógio
              </p>
              <p className="mt-1 text-xs tabular-nums text-muted">
                Tempo {formatClock(elapsed)}
              </p>
            </div>
            <p className="w-11 text-right font-display text-lg tabular-nums">
              {correct}/{PRACTICE_SIZE}
            </p>
          </div>

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className="h-full rounded-full bg-accent"
              style={{ width: `${(correct / PRACTICE_SIZE) * 100}%` }}
            />
          </div>

          <div className="flex flex-1 flex-col items-center justify-center py-6">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.16em] text-muted">
              Tabuada do {fact.a}
            </p>
            <p
              key={flashKey}
              className={cn(
                "font-display text-display tracking-tight tabular-nums",
                flash === "ok" && "anim-pop text-ok",
                flash === "bad" && "anim-shake text-bad",
              )}
            >
              {fact.a} × {fact.b}
            </p>
            <div className="mt-8 flex min-h-16 items-center justify-center">
              {reveal !== null ? (
                <p className="font-display text-3xl text-muted">= {reveal}</p>
              ) : (
                <p className="font-display text-5xl tabular-nums tracking-tight">
                  {typed || <span className="text-faint">?</span>}
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="safe-bottom flex flex-col justify-end bg-surface/80 px-4 pt-4 sm:px-6 lg:border-l lg:border-line">
          <NumberPad
            onDigit={onDigit}
            onBack={onBack}
            onSubmit={() => submit()}
            disabled={reveal !== null}
          />
        </section>
      </div>
    </div>
  );
}
