import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Check, ChevronDown, Clock, Rocket, Shield, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GalaxyMap } from "@/components/galaxy-map";
import { MasteryGrid } from "@/components/mastery-grid";
import { Mascot } from "@/components/mascot";
import { QuestCard } from "@/components/quest-card";
import { WeekStrip } from "@/components/week-strip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { currentStreak } from "@/lib/game/adaptive";
import { unreadAlerts } from "@/lib/game/alerts";
import { todayDone } from "@/lib/game/daily";
import { missionsToPrize, nicoCheer, prizeLabel } from "@/lib/game/motivate";
import { hasPractice, practiceTargets } from "@/lib/game/practice";
import { rankById, timeWithBoost } from "@/lib/game/ranks";
import { usePlayer } from "@/lib/game/store";
import { planetAt, shipForLevel, PLANETS } from "@/lib/game/worlds";
import { DAILY_GOAL, PRIZE_EVERY, displayName, formatClock, todayKey } from "@/lib/game/types";

export function HomeDashboard() {
  const player = usePlayer();
  const [showMastery, setShowMastery] = useState(false);
  const setPlanet = usePlayer((s) => s.setPlanet);
  const planet = planetAt(player.selectedPlanet);
  const rank = rankById(planet.rankId);
  const ship = shipForLevel(player.level);
  const today = player.days[todayKey()] ?? { answered: 0, correct: 0, missions: 0 };
  const streak = currentStreak(player);
  const doneToday = todayDone(player);
  const prizeReady = player.prizeCycle >= PRIZE_EVERY;
  const limitMs = timeWithBoost(
    rank,
    player.consecutiveFails,
    (player.extraTimeSec ?? 15) * 1000,
  );
  const name = displayName(player);
  const unread = unreadAlerts(player).length;
  const cheer = nicoCheer(player);
  const left = missionsToPrize(player);
  const prize = prizeLabel(player.prizeName);
  const canPractice = hasPractice(player);
  const practiceTop = canPractice ? practiceTargets(player, 3) : [];

  return (
    <AppShell
      compact
      right={
        <Link
          to="/pais"
          className="text-sm font-medium text-muted no-underline hover:text-ink"
        >
          Pais
          {unread > 0 ? (
            <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-accent-fg">
              {unread}
            </span>
          ) : null}
        </Link>
      }
    >
      <div className="anim-rise space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">Olá, {name}</p>
            <h1 className="mt-1 font-display text-title">Rota das Estrelas</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className="border-accent/20 bg-wash text-accent">
                Nível {player.level}
              </Badge>
              <Badge>{rank.name}</Badge>
              <Badge>
                <Clock className="mr-1 size-3.5" strokeWidth={2} />
                {formatClock(limitMs)}
              </Badge>
              {streak > 0 ? (
                <Badge>
                  {streak} dia{streak > 1 ? "s" : ""} seguido{streak > 1 ? "s" : ""}
                </Badge>
              ) : null}
              {player.shields > 0 ? (
                <Badge title="Um dia perdido gasta um escudo e a sequência sobrevive">
                  <Shield className="mr-1 size-3.5" strokeWidth={2} />
                  {player.shields} escudo{player.shields > 1 ? "s" : ""}
                </Badge>
              ) : null}
            </div>
          </div>
          <img
            src={ship.art}
            alt={ship.name}
            className="hidden h-28 w-28 object-contain sm:block"
            draggable={false}
          />
        </div>

        {prizeReady ? (
          <Card className="border-accent/30 bg-wash">
            <p className="font-display text-lg">Hora de {prize}.</p>
            <p className="mt-1 text-sm text-muted">
              Dez missões no bolso. Chame quem prometeu.
            </p>
            <Link to="/pais" className="mt-3 inline-flex">
              <Button>Abrir o espaço dos pais</Button>
            </Link>
          </Card>
        ) : null}

        <Card className={doneToday ? "border-accent/30 bg-wash p-5" : "p-5"}>
          <div className="flex items-start gap-3">
            <Mascot mood={cheer.mood} className="h-16 w-16 shrink-0 sm:h-20 sm:w-20" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-muted">Missão de hoje</p>
              {doneToday ? (
                <p className="mt-1 font-display text-2xl">Feito.</p>
              ) : (
                <p className="mt-1 font-display text-2xl">Uma decolagem</p>
              )}
              <p className="mt-1 text-sm text-muted">{cheer.text}</p>
            </div>
            {doneToday ? (
              <span className="inline-flex size-10 shrink-0 items-center justify-center rounded-full bg-accent text-accent-fg">
                <Check className="size-5" strokeWidth={2.5} />
              </span>
            ) : (
              <p className="shrink-0 font-display text-3xl tabular-nums">
                {Math.min(today.correct, DAILY_GOAL)}
                <span className="text-xl text-muted">/{DAILY_GOAL}</span>
              </p>
            )}
          </div>
          {doneToday ? null : <Progress className="mt-4" value={today.correct} max={DAILY_GOAL} />}
          <div className="mt-4">
            <WeekStrip days={player.days} />
          </div>
        </Card>

        <QuestCard />

        <Link to="/play" className="block no-underline">
          <Button
            size="xl"
            variant={doneToday ? "secondary" : "primary"}
            className="w-full gap-3 rounded-2xl text-xl"
          >
            <Rocket className="size-6" strokeWidth={2} />
            {doneToday ? "Jogar mais um pouco" : `Missão de hoje · ${planet.name}`}
          </Button>
        </Link>
        {doneToday ? (
          <p className="text-center text-sm text-muted">Pode encerrar. Até amanhã.</p>
        ) : null}

        {canPractice ? (
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <h2 className="font-display text-lg">Treino das teimosas</h2>
                <p className="mt-1 text-sm text-muted">
                  Dez acertos, sem relógio. Só as contas que travam.
                </p>
                <p className="mt-2 font-display tabular-nums text-muted">
                  {practiceTop.map((t) => `${t.fact.a}×${t.fact.b}`).join(" · ")}
                </p>
              </div>
              <Link to="/treino" className="no-underline">
                <Button variant="secondary">Treinar agora</Button>
              </Link>
            </div>
          </Card>
        ) : null}

        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg">Mapa da frota</h2>
              <p className="text-sm text-muted">{planet.blurb}</p>
            </div>
            <p className="text-sm tabular-nums text-muted">
              {player.selectedPlanet + 1}/{PLANETS.length}
            </p>
          </div>
          <GalaxyMap
            selected={player.selectedPlanet}
            furthest={player.furthestPlanet}
            stars={player.planetStars}
            bestMs={player.planetBestMs ?? []}
            onSelect={setPlanet}
          />
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowMastery((v) => !v)}
            className="flex w-full items-center justify-between rounded-md border border-line bg-surface px-4 py-3 text-left"
            aria-expanded={showMastery}
          >
            <span className="font-display text-lg">Minhas tabuadas</span>
            <ChevronDown
              className={`size-5 text-muted transition-transform ${showMastery ? "rotate-180" : ""}`}
              strokeWidth={2}
            />
          </button>
          {showMastery ? (
            <Card className="anim-rise mt-2">
              <p className="mb-4 text-sm text-muted">Verde cheio = conta no automático.</p>
              <MasteryGrid state={player} compact />
            </Card>
          ) : null}
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg">
              {prizeReady ? `Prêmio: ${prize}` : `Faltam ${left} para ${prize}`}
            </h2>
            <span className="text-sm tabular-nums text-muted">
              {Math.min(player.prizeCycle, PRIZE_EVERY)}/{PRIZE_EVERY}
            </span>
          </div>
          <div className="grid grid-cols-10 gap-1.5">
            {Array.from({ length: PRIZE_EVERY }, (_, i) => (
              <div
                key={i}
                className={
                  i < player.prizeCycle
                    ? "flex aspect-square items-center justify-center rounded-sm border border-accent bg-accent text-accent-fg"
                    : "flex aspect-square items-center justify-center rounded-sm border border-line bg-surface text-faint"
                }
              >
                <Trophy className="size-3.5" strokeWidth={2} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
