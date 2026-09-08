import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, Coins, Flag, ShieldCheck, Target, Trophy } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ChampionshipPath } from "@/components/galaxy-map";
import { MascotScene } from "@/components/mascot-scene";
import { WeekStrip } from "@/components/week-strip";
import { useGameDate } from "@/components/use-game-date";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { NextCosmetic } from "@/components/next-cosmetic";
import { unreadAlerts } from "@/lib/game/alerts";
import { clubSummary } from "@/lib/game/club";
import { getDailyCoach } from "@/lib/game/coaching";
import { missionsToPrize, prizeLabel } from "@/lib/game/motivate";
import { rankById, timeWithBoost } from "@/lib/game/ranks";
import { usePlayer } from "@/lib/game/store";
import { planetAt, PLANETS, SHIPS } from "@/lib/game/worlds";
import { DAILY_GOAL, PRIZE_EVERY, displayName, formatClock, todayKey } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function HomeDashboard() {
  const player = usePlayer();
  const date = useGameDate();
  const planet = planetAt(player.selectedPlanet);
  const rank = rankById(planet.rankId);
  const today = player.days[todayKey(date)] ?? { answered: 0, correct: 0, missions: 0 };
  const club = clubSummary(player, todayKey(date));
  const doneToday = club.missionRewarded;
  const coach = getDailyCoach(player, rank.id, date);
  const prizeReady = player.prizeCycle >= PRIZE_EVERY;
  const limitMs = timeWithBoost(rank, player.consecutiveFails, (player.extraTimeSec ?? 15) * 1000);
  const unread = unreadAlerts(player).length;
  const prize = prizeLabel(player.prizeName);

  return (
    <AppShell
      compact
      right={
        <nav className="club-nav" aria-label="Navegação do clube">
          <Link to="/vestiario">Vestiário</Link>
          <Link to="/pais">
            Pais{unread > 0 ? <span className="club-unread">{unread}</span> : null}
          </Link>
        </nav>
      }
    >
      <div className="club-home">
        <div className="club-welcome">
          <div>
            <p className="match-eyebrow">Missão Tabuada · meu clube</p>
            <p className="club-greeting">Bom te ver, {displayName(player)}.</p>
          </div>
          <Link
            to="/vestiario"
            className="club-wallet"
            aria-label={`${club.balance} moedas do clube. Abrir Vestiário`}
          >
            <Coins aria-hidden="true" />
            <span>
              <strong>{player.hydrated ? club.balance : "—"}</strong>
              <small>moedas do clube</small>
            </span>
          </Link>
        </div>

        <section className="club-hero" aria-labelledby="club-hero-title">
          <div className="club-hero-copy">
            <p className="club-overline">
              <span className="club-live-dot" />
              {doneToday ? "Missão de hoje concluída" : "Nico está no seu time"}
            </p>
            <h1 id="club-hero-title">
              {doneToday ? (
                <>
                  Bom jogo.
                  <br />
                  Agora é com você.
                </>
              ) : (
                <>
                  Seu clube.
                  <br />
                  Sua próxima conquista.
                </>
              )}
            </h1>
            <p className="club-hero-description">
              {doneToday
                ? "Você já treinou hoje. Curta suas conquistas e volte quando quiser continuar."
                : "Entre em campo, melhore suas contas e dê a sua cara ao clube."}
            </p>
            <div className="club-hero-mission">
              <div>
                <span>{doneToday ? "Objetivo alcançado" : "Sua missão de hoje"}</span>
                <strong>{doneToday ? "5 gols. Um passo a mais." : "15 acertos. 5 gols."}</strong>
              </div>
              <span className="club-reward">
                <Coins aria-hidden="true" />
                {doneToday ? "20 recebidas" : "+20 moedas"}
              </span>
            </div>
            <Link
              to={doneToday ? "/vestiario" : "/play"}
              className={cn(buttonVariants({ size: "lg" }), "club-primary no-underline")}
            >
              {doneToday ? "Ver minhas conquistas" : "Entrar em campo"}
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
            <p className="club-hero-footnote">
              {doneToday
                ? "Sem pressa. Seu progresso fica com você."
                : `${planet.name} · ${formatClock(limitMs)} de partida · pode errar e tentar de novo`}
            </p>
          </div>
          <div className="club-hero-field">
            <MascotScene mood={doneToday ? "win" : "guide"} className="club-hero-scene" priority />
            <div className="club-field-caption">
              <span>SEU CAMPO</span>
              <strong>Nico + você</strong>
              <span>Mesmo time. Todo dia.</span>
            </div>
          </div>
        </section>

        <section className="club-day-strip" aria-label="Acertos praticados hoje">
          <span className="club-day-icon">
            {doneToday ? <Check aria-hidden="true" /> : <Flag aria-hidden="true" />}
          </span>
          <div className="club-day-progress">
            <div>
              <strong>{doneToday ? "Missão completa" : "Acertos praticados hoje"}</strong>
              <span>{today.correct} acertos</span>
            </div>
            <Progress value={Math.min(today.correct, DAILY_GOAL)} max={DAILY_GOAL} />
          </div>
          <p>
            {doneToday ? "20 moedas no seu clube" : "Complete uma partida para ganhar 20 moedas"}
          </p>
        </section>

        <div className="club-next-grid">
          <section className="club-coach" aria-labelledby="club-coach-title">
            <div className="club-section-kicker">
              <Target className="size-4" aria-hidden="true" />
              {club.focusRewarded ? "Bônus de foco conquistado" : "Foco da partida"}
            </div>
            <h2 id="club-coach-title">
              {club.focusRewarded ? "Uma jogada a mais no repertório." : coach.title}
            </h2>
            <p>
              {club.focusRewarded
                ? "Você respondeu três contas do foco sem ajuda. Vamos revisitar esse conteúdo em outro dia."
                : coach.description}
            </p>
            <div className="club-coach-detail">
              <span>{club.focusRewarded ? "Seu esforço apareceu" : coach.focusLabel}</span>
              <span className="club-reward">
                <Coins aria-hidden="true" />
                {club.focusRewarded ? "10 recebidas" : "+10 moedas"}
              </span>
            </div>
            <p className="club-focus-rule">
              {club.focusRewarded
                ? "Por hoje, já valeu. Seu próximo passo pode esperar."
                : "Na partida, acerte 3 contas diferentes deste foco, de primeira. O bônus é opcional."}
            </p>
            <Link
              to="/treino"
              className={cn(buttonVariants({ variant: "secondary" }), "w-full no-underline")}
            >
              Treinar com Nico
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
            <p className="club-small-note">
              Precisa de ajuda? Treino livre, sem cronômetro e sem moedas.
            </p>
          </section>
          <NextCosmetic />
        </div>

        <section className="club-week" aria-label="Sua semana de aprendizado">
          <div>
            <p className="club-section-kicker">Seu ritmo também conta</p>
            <h2>Um pouco por dia. Cada vez melhor.</h2>
            <p>Faltou um dia? Tudo bem. Suas conquistas continuam aqui.</p>
          </div>
          <WeekStrip days={player.days} />
        </section>

        <section className="club-career" aria-labelledby="club-career-title">
          <div className="club-section-heading">
            <div>
              <p className="club-section-kicker">Seu caminho no futebol</p>
              <h2 id="club-career-title">Do primeiro toque ao troféu</h2>
              <p>{planet.blurb}</p>
            </div>
            <span className="club-stage-count">
              {player.selectedPlanet + 1}
              <small> / {PLANETS.length}</small>
            </span>
          </div>
          <ChampionshipPath
            selected={player.selectedPlanet}
            furthest={player.furthestPlanet}
            stars={player.planetStars}
            bestMs={player.planetBestMs ?? []}
            onSelect={player.setPlanet}
          />
          <div className="club-honors" aria-label="Conquistas do campeonato">
            {SHIPS.map((honor) => (
              <div key={honor.id} data-owned={player.level >= honor.minLevel}>
                <Trophy className="size-5" aria-hidden="true" />
                <div>
                  <strong>{honor.name}</strong>
                  <span>
                    {player.level >= honor.minLevel ? "Conquistado" : `Nível ${honor.minLevel}`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="club-family-prize" aria-label="Prêmio combinado em família">
          <ShieldCheck aria-hidden="true" />
          <div>
            <h2>{prizeReady ? `Hora de ${prize}` : `O combinado em família: ${prize}`}</h2>
            <p>
              {prizeReady
                ? "Dez partidas completas. Celebre com quem combinou o prêmio."
                : `Faltam ${missionsToPrize(player)} partidas completas para esse momento.`}
            </p>
          </div>
          <Link to="/pais" className={cn(buttonVariants({ variant: "ghost" }), "no-underline")}>
            Ver combinado
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </section>
      </div>
    </AppShell>
  );
}
