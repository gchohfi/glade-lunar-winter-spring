import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Clock, X } from "lucide-react";
import { NumberPad } from "@/components/number-pad";
import { FlightTrack } from "@/components/flight-track";
import { StarRow } from "@/components/star-row";
import { persistCloud } from "@/components/cloud-sync";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { drawNext, pickMissionFacts, recycleMiss } from "@/lib/game/adaptive";
import type { ProgressDelta } from "@/lib/game/progress";
import { xpToNext } from "@/lib/game/progress";
import {
  playCorrect,
  playFail,
  playPromote,
  playTap,
  playWin,
  playWrong,
  unlockAudio,
} from "@/lib/game/audio";
import { rankById, timeWithBoost } from "@/lib/game/ranks";
import { usePlayer } from "@/lib/game/store";
import { planetAt, shipForLevel } from "@/lib/game/worlds";
import {
  TARGET_CORRECT,
  factAnswer,
  factKey,
  factOp,
  formatAnswer,
  formatClock,
  guessesMatch,
  parseGuess,
  type Fact,
} from "@/lib/game/types";
import { cn } from "@/lib/utils";

type Phase = "ready" | "running" | "won" | "lost";
type Flash = "none" | "ok" | "bad";

export function MissionPlay() {
  const navigate = useNavigate();
  const snapshot = usePlayer((s) => s.snapshot);
  const applyMission = usePlayer((s) => s.applyMission);
  const consecutiveFails = usePlayer((s) => s.consecutiveFails);
  const selectedPlanet = usePlayer((s) => s.selectedPlanet);
  const setPlanet = usePlayer((s) => s.setPlanet);
  const level = usePlayer((s) => s.level);
  const xp = usePlayer((s) => s.xp);
  const extraTimeSec = usePlayer((s) => s.extraTimeSec);
  const planetBestMs = usePlayer((s) => s.planetBestMs);
  const planet = planetAt(selectedPlanet);
  const rank = rankById(planet.rankId);
  const ship = shipForLevel(level);
  const defaultLimit = timeWithBoost(rank, consecutiveFails, extraTimeSec * 1000);

  const [phase, setPhase] = useState<Phase>("ready");
  const [flash, setFlash] = useState<Flash>("none");
  const [flashKey, setFlashKey] = useState(0);
  const [typed, setTyped] = useState("");
  const [correct, setCorrect] = useState(0);
  const [wrong, setWrong] = useState(0);
  const [combo, setCombo] = useState(0);
  const [remaining, setRemaining] = useState(defaultLimit);
  const [runLimit, setRunLimit] = useState(defaultLimit);
  const [fact, setFact] = useState<Fact>({ a: 3, b: 4, op: "mul" });
  const [reveal, setReveal] = useState<number | null>(null);
  const [prizeReady, setPrizeReady] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [delta, setDelta] = useState<ProgressDelta | null>(null);
  const [dailyJustDone, setDailyJustDone] = useState(false);
  const [qRemaining, setQRemaining] = useState(rank.questionLimitMs);

  const queueRef = useRef<Fact[]>([]);
  const startedAtRef = useRef(0);
  const qStartRef = useRef(0);
  const limitRef = useRef(defaultLimit);
  const qLimitRef = useRef(rank.questionLimitMs);
  const triedRef = useRef<Array<{ fact: Fact; ok: boolean; ms: number }>>([]);
  const endedRef = useRef(false);
  const factRef = useRef(fact);
  const typedRef = useRef("");
  const correctRef = useRef(0);
  const wrongRef = useRef(0);
  const comboRef = useRef(0);
  const bestComboRef = useRef(0);
  const revealRef = useRef<number | null>(null);
  const phaseRef = useRef<Phase>(phase);
  const revealTimer = useRef<number | null>(null);
  const winningRef = useRef(false);
  const resolvedRef = useRef(false);

  factRef.current = fact;
  typedRef.current = typed;
  correctRef.current = correct;
  wrongRef.current = wrong;
  comboRef.current = combo;
  revealRef.current = reveal;
  phaseRef.current = phase;

  const finish = useCallback(
    (passed: boolean) => {
      if (endedRef.current) return;
      endedRef.current = true;
      const finishedAt = Date.now();
      const cap = limitRef.current;
      const elapsedMs = Math.min(cap, finishedAt - startedAtRef.current);
      const state = snapshot();
      const p = planetAt(state.selectedPlanet);
      const result = applyMission({
        mode: "multiplication",
        rankId: p.rankId,
        startedAt: startedAtRef.current,
        finishedAt,
        elapsedMs,
        timeLimitMs: cap,
        correct: correctRef.current,
        wrong: wrongRef.current,
        passed,
        factsTried: triedRef.current,
        bestCombo: bestComboRef.current,
        planetIndex: state.selectedPlanet,
      });
      setElapsed(elapsedMs);
      setPrizeReady(result.prizeReady);
      setDelta(result.progress);
      setDailyJustDone(result.dailyJustDone);
      setPhase(passed ? "won" : "lost");
      if (passed) {
        if (result.progress.leveledTo || result.progress.unlockedPlanet !== null) playPromote();
        else playWin();
      } else {
        playFail();
      }
      persistCloud();
    },
    [applyMission, snapshot],
  );

  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => {
    if (phase !== "running") return;
    const t0 = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const left = Math.max(0, limitRef.current - (now - t0));
      setRemaining(left);
      if (left <= 0) {
        if (!winningRef.current) finishRef.current(false);
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, runLimit]);

  const timeoutMiss = () => {
    if (phaseRef.current !== "running" || revealRef.current !== null || resolvedRef.current) return;
    resolvedRef.current = true;
    const current = factRef.current;
    const answer = factAnswer(current);
    record(false);
    playWrong();
    wrongRef.current += 1;
    comboRef.current = 0;
    setWrong(wrongRef.current);
    setCombo(0);
    setFlash("bad");
    setFlashKey((k) => k + 1);
    setReveal(answer);
    if (revealTimer.current) window.clearTimeout(revealTimer.current);
    revealTimer.current = window.setTimeout(() => goNext(false, current), 900);
  };

  const timeoutMissRef = useRef(timeoutMiss);
  timeoutMissRef.current = timeoutMiss;

  useEffect(() => {
    if (phase !== "running") return;
    let raf = 0;
    const tick = () => {
      if (revealRef.current !== null) {
        raf = requestAnimationFrame(tick);
        return;
      }
      const left = Math.max(0, qLimitRef.current - (performance.now() - qStartRef.current));
      setQRemaining(left);
      if (left <= 0) {
        timeoutMissRef.current();
        return;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, fact]);

  const begin = () => {
    unlockAudio();
    winningRef.current = false;
    resolvedRef.current = false;
    endedRef.current = false;
    triedRef.current = [];
    comboRef.current = 0;
    bestComboRef.current = 0;
    const state = snapshot();
    const p = planetAt(state.selectedPlanet);
    const r = rankById(p.rankId);
    const missionLimit = timeWithBoost(r, state.consecutiveFails, state.extraTimeSec * 1000);
    limitRef.current = missionLimit;
    qLimitRef.current = r.questionLimitMs;
    setRunLimit(missionLimit);
    const deck = pickMissionFacts({ ...state, rankId: p.rankId });
    const first = deck[0] ?? { a: 3, b: 4, op: "mul" };
    queueRef.current = deck.slice(1);
    factRef.current = first;
    correctRef.current = 0;
    wrongRef.current = 0;
    setFact(first);
    setTyped("");
    setCorrect(0);
    setWrong(0);
    setCombo(0);
    setReveal(null);
    setRemaining(missionLimit);
    setQRemaining(r.questionLimitMs);
    setPrizeReady(false);
    setDelta(null);
    setDailyJustDone(false);
    startedAtRef.current = Date.now();
    qStartRef.current = performance.now();
    setPhase("running");
  };

  const record = (ok: boolean) => {
    const ms = performance.now() - qStartRef.current;
    triedRef.current.push({ fact: factRef.current, ok, ms });
  };

  const goNext = (ok: boolean, missed?: Fact) => {
    qStartRef.current = performance.now();
    resolvedRef.current = false;
    setTyped("");
    typedRef.current = "";
    setReveal(null);
    setFlash("none");
    if (!ok && missed) {
      queueRef.current = recycleMiss(queueRef.current, missed);
    }
    if (queueRef.current.length < 2) {
      const extra = pickMissionFacts({
        ...snapshot(),
        rankId: planetAt(snapshot().selectedPlanet).rankId,
      }).filter((f) => factKey(f) !== factKey(factRef.current));
      queueRef.current = [...queueRef.current, ...extra];
    }
    const drawn = drawNext(queueRef.current, factRef.current);
    queueRef.current = drawn.queue;
    factRef.current = drawn.fact;
    setFact(drawn.fact);
  };

  const submit = (raw?: string) => {
    if (phaseRef.current !== "running" || revealRef.current !== null || resolvedRef.current) return;
    const value = (raw ?? typedRef.current).trim();
    if (!value) return;
    const guess = parseGuess(value);
    if (!Number.isFinite(guess)) return;
    const current = factRef.current;
    const answer = factAnswer(current);
    if (guessesMatch(guess, answer)) {
      resolvedRef.current = true;
      record(true);
      playCorrect();
      setFlash("ok");
      setFlashKey((k) => k + 1);
      correctRef.current += 1;
      comboRef.current += 1;
      bestComboRef.current = Math.max(bestComboRef.current, comboRef.current);
      setCorrect(correctRef.current);
      setCombo(comboRef.current);
      if (correctRef.current >= TARGET_CORRECT) {
        winningRef.current = true;
        window.setTimeout(() => finishRef.current(true), 320);
      } else {
        window.setTimeout(() => goNext(true), 220);
      }
    } else {
      resolvedRef.current = true;
      record(false);
      playWrong();
      wrongRef.current += 1;
      comboRef.current = 0;
      setWrong(wrongRef.current);
      setCombo(0);
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
      if (d === ",") {
        if (prev.includes(",") || prev.length === 0) return prev;
      }
      if (prev.length >= 5) return prev;
      const next = prev + d;
      typedRef.current = next;
      const guess = parseGuess(next);
      if (guessesMatch(guess, factAnswer(factRef.current))) {
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
      } else if (e.key === "," || e.key === ".") {
        e.preventDefault();
        onDigit(",");
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

  const urgent = remaining < 10_000;
  const ratio = remaining / runLimit;
  const qRatio = qLimitRef.current > 0 ? qRemaining / qLimitRef.current : 0;
  const qUrgent = qRatio < 0.25;
  const elapsedLive = Math.max(0, runLimit - remaining);
  const bestHere = planetBestMs[selectedPlanet] ?? 0;

  if (phase === "ready") {
    return (
      <div className="paper-grid flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
        <img
          src={planet.art}
          alt=""
          className="h-40 w-40 rounded-full object-cover shadow-soft"
          draggable={false}
        />
        <p className="mt-4 text-sm font-medium uppercase tracking-[0.14em] text-muted">
          {rank.name} · Nível {level}
        </p>
        <h1 className="mt-2 font-display text-title">{planet.name}</h1>
        <p className="mt-3 max-w-sm text-muted">
          {planet.blurb} Quinze acertos com {formatClock(defaultLimit)} no
          relógio. Cada acerto empurra a nave.
        </p>
        {bestHere > 0 ? (
          <p className="mt-2 font-display text-lg tabular-nums">
            Recorde: {formatClock(bestHere)}
          </p>
        ) : null}
        <Button size="xl" className="mt-8 w-full max-w-sm" onClick={begin}>
          Decolar
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

  if (phase === "won" || phase === "lost") {
    const need = xpToNext(level);
    const nextPlanet =
      delta?.unlockedPlanet !== null && delta?.unlockedPlanet !== undefined
        ? planetAt(delta.unlockedPlanet)
        : null;
    return (
      <div className="paper-grid flex min-h-dvh flex-col items-center justify-center px-4 py-10 text-center">
        <img
          src={phase === "won" ? ship.art : planet.art}
          alt=""
          className="h-36 w-36 object-contain"
          draggable={false}
        />
        <h1 className="mt-2 font-display text-title">
          {phase === "won"
            ? delta?.leveledTo
              ? `Nível ${delta.leveledTo}!`
              : "Planeta conquistado"
            : "Quase lá"}
        </h1>
        <p className="mt-2 max-w-sm text-muted">
          {phase === "won"
            ? `Quinze acertos em ${formatClock(elapsed)}. +${delta?.xpGained ?? 0} XP.`
            : `${correct} acerto${correct === 1 ? "" : "s"} com ${formatClock(runLimit)} no relógio. Ainda ganhou +${delta?.xpGained ?? 0} XP.`}
        </p>
        {phase === "won" && dailyJustDone ? (
          <p className="mt-2 max-w-sm font-display text-accent">
            Missão de hoje cumprida. A sequência continua.
          </p>
        ) : null}
        {phase === "won" && delta?.isRecord ? (
          <p className="mt-1 font-display text-accent">Novo recorde de tempo!</p>
        ) : null}
        {phase === "won" ? (
          <div className="mt-4 space-y-1">
            <StarRow value={delta?.starsEarned ?? 0} />
            <p className="text-sm text-muted">
              {delta?.starsEarned ?? 0} estrela{(delta?.starsEarned ?? 0) === 1 ? "" : "s"} neste planeta
            </p>
          </div>
        ) : null}
        <Card className="mt-5 w-full max-w-sm p-4 text-left">
          <p className="text-sm font-medium text-muted">Nível {level}</p>
          <Progress className="mt-2" value={xp} max={need} />
          <p className="mt-2 text-sm tabular-nums text-muted">
            {xp} / {need} XP
          </p>
          {nextPlanet ? (
            <p className="mt-3 font-display">Novo planeta: {nextPlanet.name}</p>
          ) : null}
          {delta?.newShipName ? (
            <p className="mt-1 font-display">Nova nave: {delta.newShipName}</p>
          ) : null}
        </Card>
        {prizeReady ? (
          <Card className="mt-4 max-w-sm border-accent/30 bg-wash p-4">
            <p className="font-display">Dez missões no bolso.</p>
            <p className="mt-1 text-sm text-muted">Chame quem prometeu o prêmio.</p>
          </Card>
        ) : null}
        <div className="mt-8 flex w-full max-w-sm flex-col gap-3">
          {phase === "lost" || !prizeReady ? (
            <Button
              size="lg"
              className="w-full"
              onClick={() => {
                if (delta?.unlockedPlanet != null) setPlanet(delta.unlockedPlanet);
                begin();
              }}
            >
              {nextPlanet
                ? `Decolar para ${nextPlanet.name}`
                : phase === "won"
                  ? "De novo neste planeta"
                  : "Tentar de novo"}
            </Button>
          ) : null}
          {prizeReady ? (
            <Button size="lg" className="w-full" onClick={() => navigate({ to: "/pais" })}>
              Ir ao espaço dos pais
            </Button>
          ) : null}
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
              aria-label="Sair da missão"
            >
              <X className="size-5" strokeWidth={2} />
            </button>
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 font-display text-lg tabular-nums",
                  urgent
                    ? "border-bad/30 bg-bad/10 text-bad"
                    : "border-line bg-surface text-ink",
                )}
              >
                <Clock className="size-4" strokeWidth={2} />
                {formatClock(remaining)}
              </div>
              <p className="mt-1 text-xs tabular-nums text-muted">
                Tempo {formatClock(elapsedLive)}
              </p>
            </div>
            <p className="w-11 text-right font-display text-lg tabular-nums">
              {correct}/{TARGET_CORRECT}
            </p>
          </div>

          <FlightTrack
            correct={correct}
            combo={combo}
            shipArt={ship.art}
            planetArt={planet.art}
          />

          <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
            <div
              className={cn("h-full rounded-full", urgent ? "bg-bad" : "bg-accent")}
              style={{ width: `${Math.max(0, ratio * 100)}%` }}
            />
          </div>

          <div className="flex flex-1 flex-col items-center justify-center py-6">
            <p className="mb-4 text-sm font-medium uppercase tracking-[0.16em] text-muted">
              {factOp(fact) === "div" ? `Dividir por ${fact.b}` : `Tabuada do ${fact.a}`}
            </p>
            <p
              key={flashKey}
              className={cn(
                "font-display text-display tracking-tight tabular-nums",
                flash === "ok" && "anim-pop text-ok",
                flash === "bad" && "anim-shake text-bad",
              )}
            >
              {fact.a} {factOp(fact) === "div" ? "÷" : "×"} {fact.b}
            </p>
            <div className="mt-8 flex min-h-16 items-center justify-center">
              {reveal !== null ? (
                <p className="font-display text-3xl text-muted">= {formatAnswer(reveal)}</p>
              ) : (
                <p className="font-display text-5xl tabular-nums tracking-tight">
                  {typed || <span className="text-faint">?</span>}
                </p>
              )}
            </div>
            <div className="mt-6 h-1 w-full max-w-40 overflow-hidden rounded-full bg-line">
              <div
                className={cn(
                  "h-full rounded-full transition-[width] duration-100 ease-linear",
                  qUrgent ? "bg-bad" : "bg-accent/70",
                )}
                style={{ width: `${Math.max(0, qRatio * 100)}%` }}
              />
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
