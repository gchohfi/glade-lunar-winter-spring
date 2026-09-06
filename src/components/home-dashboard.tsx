import { Link } from "@tanstack/react-router";
import { Check, Clock, Flag, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ChampionshipPath } from "@/components/galaxy-map";
import { MascotScene } from "@/components/mascot-scene";
import { WeekStrip } from "@/components/week-strip";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { NextCosmetic } from "@/components/next-cosmetic";
import { currentStreak } from "@/lib/game/adaptive";
import { unreadAlerts } from "@/lib/game/alerts";
import { todayDone } from "@/lib/game/daily";
import { missionsToPrize, nicoCheer, prizeLabel } from "@/lib/game/motivate";
import { rankById, timeWithBoost } from "@/lib/game/ranks";
import { usePlayer } from "@/lib/game/store";
import { planetAt, PLANETS, SHIPS } from "@/lib/game/worlds";
import { DAILY_GOAL, PRIZE_EVERY, displayName, formatClock, todayKey } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function HomeDashboard() {
  const player = usePlayer();
  const setPlanet = usePlayer((s) => s.setPlanet);
  const planet = planetAt(player.selectedPlanet);
  const rank = rankById(planet.rankId);
  const today = player.days[todayKey()] ?? { answered: 0, correct: 0, missions: 0 };
  const streak = currentStreak(player);
  const doneToday = todayDone(player);
  const prizeReady = player.prizeCycle >= PRIZE_EVERY;
  const limitMs = timeWithBoost(rank, player.consecutiveFails, (player.extraTimeSec ?? 15) * 1000);
  const name = displayName(player);
  const unread = unreadAlerts(player).length;
  const cheer = nicoCheer(player);
  const left = missionsToPrize(player);
  const prize = prizeLabel(player.prizeName);

  return (
    <AppShell
      compact
      right={
        <div className="flex items-center gap-4">
          <Link
            to="/vestiario"
            className="text-sm font-medium text-accent no-underline hover:text-ink"
          >
            Vestiário
          </Link>
          <Link to="/pais" className="text-sm font-medium text-muted no-underline hover:text-ink">
            Pais
            {unread > 0 ? (
              <span className="ml-2 inline-flex min-w-5 items-center justify-center rounded-full bg-accent px-1.5 text-xs font-medium text-accent-fg">
                {unread}
              </span>
            ) : null}
          </Link>
        </div>
      }
    >
      <div className="anim-rise space-y-6">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-muted">Olá, {name}</p>
            <h1 className="mt-1 font-display text-title">Meu campeonato</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className="border-accent/20 bg-wash text-accent">Nível {player.level}</Badge>
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
            </div>
          </div>
        </div>

        {prizeReady ? (
          <Card className="border-accent/30 bg-wash">
            <p className="font-display text-lg">Hora de {prize}.</p>
            <p className="mt-1 text-sm text-muted">
              Dez partidas completas. Celebre com quem combinou o prêmio.
            </p>
            <Link to="/pais" className="mt-3 inline-flex">
              <Button>Abrir o espaço dos pais</Button>
            </Link>
          </Card>
        ) : null}

        <Card className={cn("nico-departure", doneToday && "border-accent/30 bg-wash")}>
          <div className="nico-departure-layout">
            <MascotScene mood={doneToday ? "win" : "guide"} className="nico-scene-home" priority />
            <div className="nico-departure-content">
              <p className="text-sm font-medium text-accent">Nico · seu companheiro de time</p>
              <h2 className="mt-2 font-display text-2xl">
                {doneToday ? "Conseguimos por hoje!" : "Bora jogar no mesmo time?"}
              </h2>
              <p className="mt-2 text-sm text-muted">{cheer.text}</p>
              <p className="mt-2 text-sm font-medium text-accent">
                2 passes + 1 chute = gol. 15 acertos = 5 gols.
              </p>
              <div className="mt-5 flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-muted">Treino de hoje</p>
                <p className="inline-flex items-center gap-2 font-display text-lg tabular-nums">
                  {doneToday ? <Check className="size-4 text-accent" aria-hidden="true" /> : null}
                  {Math.min(today.correct, DAILY_GOAL)}/{DAILY_GOAL} acertos
                </p>
              </div>
              <Progress
                className="mt-2"
                value={Math.min(today.correct, DAILY_GOAL)}
                max={DAILY_GOAL}
              />
              <Link to="/play" className="mt-5 block no-underline">
                <Button
                  size="xl"
                  variant={doneToday ? "secondary" : "primary"}
                  className="w-full gap-3"
                >
                  <Flag className="size-5" strokeWidth={2} />
                  {doneToday ? "Jogar outra partida" : "Entrar em campo"}
                </Button>
              </Link>
              <p className="mt-3 text-sm text-muted">
                {doneToday
                  ? "Pode encerrar. Nosso próximo treino é amanhã."
                  : `${planet.name} · ${formatClock(limitMs)} para esta partida`}
              </p>
              <Link
                to="/treino"
                className={cn(buttonVariants({ variant: "ghost" }), "mt-2 w-full no-underline")}
              >
                Treinar com Nico
              </Link>
              <p className="text-center text-xs text-muted">
                Opcional · cinco contas com explicação, sem cronômetro
              </p>
            </div>
          </div>
          <div className="nico-departure-week">
            <WeekStrip days={player.days} />
          </div>
        </Card>

        <NextCosmetic />
        <div>
          <div className="mb-2 flex items-end justify-between gap-3">
            <div>
              <h2 className="font-display text-lg">Do primeiro toque ao troféu</h2>
              <p className="text-sm text-muted">{planet.blurb}</p>
            </div>
            <p className="text-sm tabular-nums text-muted">
              {player.selectedPlanet + 1}/{PLANETS.length}
            </p>
          </div>
          <ChampionshipPath
            selected={player.selectedPlanet}
            furthest={player.furthestPlanet}
            stars={player.planetStars}
            bestMs={player.planetBestMs ?? []}
            onSelect={setPlanet}
          />
        </div>

        <section aria-label="Minhas conquistas">
          <h2 className="mb-3 font-display text-lg">Minhas conquistas</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {SHIPS.map((honor) => (
              <div
                key={honor.id}
                className={cn(
                  "flex items-center gap-2 rounded-md border p-3",
                  player.level >= honor.minLevel
                    ? "border-accent/20 bg-wash"
                    : "border-line bg-surface text-muted",
                )}
              >
                <Trophy className="size-5 shrink-0" aria-hidden="true" />
                <div>
                  <p className="font-display text-sm">{honor.name}</p>
                  <p className="text-xs text-muted">
                    {player.level >= honor.minLevel ? "Conquistado" : `Nível ${honor.minLevel}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-lg">
              {prizeReady ? `Prêmio: ${prize}` : `Faltam ${left} partidas para ${prize}`}
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
