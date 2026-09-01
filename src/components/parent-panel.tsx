import { useEffect } from "react";
import { Link } from "@tanstack/react-router";
import { SignedIn, SignedOut, UserButton } from "@/lib/auth/gates";
import { useCurrentUserState } from "@/lib/auth/use-current-user";
import { AppShell } from "@/components/app-shell";
import { persistCloud } from "@/components/cloud-sync";
import { ParentAlerts } from "@/components/parent-alerts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { currentStreak, weakestFacts } from "@/lib/game/adaptive";
import { unreadAlerts } from "@/lib/game/alerts";
import { missionsToPrize, prizeLabel } from "@/lib/game/motivate";
import { fireParentNotify } from "@/lib/game/notify";
import { RANKS, rankById, timeWithBoost } from "@/lib/game/ranks";
import { loadProgress } from "@/lib/server/player";
import { usePlayer } from "@/lib/game/store";
import { PLANETS } from "@/lib/game/worlds";
import {
  DAILY_GOAL,
  EXTRA_TIME_OPTIONS,
  PRIZE_EVERY,
  factKey,
  factOp,
  formatClock,
  todayKey,
  type RankId,
} from "@/lib/game/types";
import { cn } from "@/lib/utils";

function lastDays(n: number): string[] {
  const keys: string[] = [];
  const start = new Date();
  for (let i = n - 1; i >= 0; i -= 1) {
    const d = new Date(start);
    d.setDate(start.getDate() - i);
    keys.push(todayKey(d));
  }
  return keys;
}

export function ParentPanel() {
  const player = usePlayer();
  const { user } = useCurrentUserState();
  const replaceState = usePlayer((s) => s.replaceState);
  const snapshot = usePlayer((s) => s.snapshot);
  const setChildName = usePlayer((s) => s.setChildName);
  const setPrizeName = usePlayer((s) => s.setPrizeName);
  const setRank = usePlayer((s) => s.setRank);
  const setSound = usePlayer((s) => s.setSound);
  const setExtraTime = usePlayer((s) => s.setExtraTime);
  const claimPrize = usePlayer((s) => s.claimPrize);
  const rank = rankById(player.rankId);
  const clockMs = timeWithBoost(rank, player.consecutiveFails, player.extraTimeSec * 1000);
  const today = player.days[todayKey()] ?? { answered: 0, correct: 0, missions: 0 };
  const weak = weakestFacts(player);
  const streak = currentStreak(player);
  const days = lastDays(14);
  const prizeReady = player.prizeCycle >= PRIZE_EVERY;

  const save = () => persistCloud();

  useEffect(() => {
    if (!user) return;
    const tick = () => {
      void loadProgress()
        .then((remote) => {
          if (!remote) return;
          const local = snapshot();
          const remoteUnread = unreadAlerts(remote).length;
          const localUnread = unreadAlerts(local).length;
          const newer =
            remote.totalMissionsPassed > local.totalMissionsPassed ||
            remoteUnread > localUnread;
          if (!newer) return;
          replaceState(remote);
          const fresh = unreadAlerts(remote)[0];
          if (fresh && remote.notifyParents && remoteUnread > localUnread) {
            fireParentNotify(fresh);
          }
        })
        .catch(() => undefined);
    };
    const id = window.setInterval(tick, 15000);
    return () => window.clearInterval(id);
  }, [user, replaceState, snapshot]);

  return (
    <AppShell
      right={
        <div className="flex items-center gap-3">
          <SignedIn>
            <UserButton />
          </SignedIn>
          <SignedOut>
            <Link
              to="/login"
              className="text-sm font-medium text-muted no-underline hover:text-ink"
            >
              Entrar
            </Link>
          </SignedOut>
        </div>
      }
    >
      <div className="anim-rise space-y-6">
        <div>
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">
            Espaço dos pais
          </p>
          <h1 className="mt-1 font-display text-title">Progresso do cadete</h1>
          <p className="mt-2 max-w-xl text-muted">
            Um menino de 10 anos costuma levar cerca de 3 segundos por conta
            quando a tabuada já está automática. Cada patente ajusta o
            relógio conforme ele acerta missões seguidas, com multiplicação
            e divisão misturadas, do 3 ao 13.
          </p>
        </div>

        <ParentAlerts />

        <SignedOut>
          <Card className="border-accent/20 bg-wash">
            <p className="font-display text-lg">Salvar no iPad e no computador</p>
            <p className="mt-1 text-sm text-muted">
              Entre com a sua conta. O progresso dele acompanha qualquer
              aparelho — e os avisos de nível aparecem aqui no celular também.
            </p>
            <Link to="/login" className="mt-3 inline-flex">
              <Button>Entrar para sincronizar</Button>
            </Link>
          </Card>
        </SignedOut>

        {prizeReady ? (
          <Card className="border-accent/30 bg-wash">
            <p className="font-display text-lg">Hora de {prizeLabel(player.prizeName)}</p>
            <p className="mt-1 text-sm text-muted">
              Ele completou {PRIZE_EVERY} missões. Entregue e toque abaixo para
              recomeçar a contagem.
            </p>
            <Button
              className="mt-4"
              onClick={() => {
                claimPrize();
                save();
              }}
            >
              Marcar prêmio entregue
            </Button>
          </Card>
        ) : null}

        <Card className="space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-muted">Nome do cadete</span>
            <Input
              className="mt-2"
              value={player.childName}
              onChange={(e) => setChildName(e.target.value)}
              onBlur={save}
              maxLength={24}
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium text-muted">Prêmio das 10 missões</span>
            <Input
              className="mt-2"
              value={player.prizeName}
              onChange={(e) => setPrizeName(e.target.value)}
              onBlur={save}
              maxLength={40}
              placeholder="Sorvete, cinema, parque…"
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {["Sorvete", "Cinema", "Parque", "30 min de jogo", "Escolher o jantar"].map(
                (idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => {
                      setPrizeName(idea);
                      save();
                    }}
                    className={cn(
                      "rounded-full border px-3 py-1.5 text-xs font-medium",
                      player.prizeName === idea
                        ? "border-accent bg-wash text-accent"
                        : "border-line bg-surface text-muted",
                    )}
                  >
                    {idea}
                  </button>
                ),
              )}
            </div>
            <p className="mt-2 text-sm text-faint">
              Ele vê na tela. Faltam {missionsToPrize(player)} missões.
            </p>
          </label>
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-muted">Som</p>
              <p className="text-sm text-faint">Bipes curtos em cada acerto</p>
            </div>
            <Button
              variant={player.sound ? "primary" : "secondary"}
              size="sm"
              onClick={() => {
                setSound(!player.sound);
                save();
              }}
            >
              {player.sound ? "Ligado" : "Mudo"}
            </Button>
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg">Tempo extra</h2>
          <p className="mt-1 text-sm text-muted">
            Soma segundos no relógio de cada missão. Agora ele tem{" "}
            <span className="font-medium text-ink">{formatClock(clockMs)}</span>{" "}
            para 15 acertos.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            {EXTRA_TIME_OPTIONS.map((sec) => (
              <button
                key={sec}
                type="button"
                onClick={() => {
                  setExtraTime(sec);
                  save();
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-sm font-medium tabular-nums",
                  player.extraTimeSec === sec
                    ? "border-accent bg-wash text-accent"
                    : "border-line bg-surface text-muted",
                )}
              >
                {sec === 0 ? "Sem extra" : `+${sec}s`}
              </button>
            ))}
          </div>
        </Card>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <p className="text-sm text-muted">Hoje</p>
            <p className="mt-1 font-display text-2xl">
              {today.correct >= DAILY_GOAL ? "Feito" : "Ainda não"}
            </p>
            <p className="text-sm text-muted">
              {today.correct}/{DAILY_GOAL} acertos
            </p>
          </Card>
          <Card>
            <p className="text-sm text-muted">Nível</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{player.level}</p>
            <p className="text-sm text-muted">{player.xp} XP nesta barra</p>
          </Card>
          <Card>
            <p className="text-sm text-muted">Missões ganhas</p>
            <p className="mt-1 font-display text-2xl tabular-nums">
              {player.totalMissionsPassed}
            </p>
            <p className="text-sm text-muted">no total</p>
          </Card>
          <Card>
            <p className="text-sm text-muted">Sequência</p>
            <p className="mt-1 font-display text-2xl tabular-nums">{streak}</p>
            <p className="text-sm text-muted">dias com a meta</p>
          </Card>
        </div>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg">Patente</h2>
            <Badge className="border-accent/20 bg-wash text-accent">{rank.name}</Badge>
          </div>
          <p className="mt-2 text-sm text-muted">{rank.blurb}</p>
          <p className="mt-1 text-sm text-muted">
            {formatClock(clockMs)} para 15 acertos
            {player.extraTimeSec > 0 ? ` (inclui +${player.extraTimeSec}s)` : ""}
          </p>
          <Progress
            className="mt-4"
            value={RANKS.findIndex((r) => r.id === player.rankId) + 1}
            max={RANKS.length}
          />
          <div className="mt-4 flex flex-wrap gap-2">
            {RANKS.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => {
                  setRank(r.id as RankId);
                  save();
                }}
                className={cn(
                  "rounded-full border px-3 py-1.5 text-xs font-medium",
                  r.id === player.rankId
                    ? "border-accent bg-wash text-accent"
                    : "border-line bg-surface text-muted",
                )}
              >
                {r.name}
              </button>
            ))}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg">Melhor tempo por planeta</h2>
          {PLANETS.every((_, i) => !(player.planetBestMs[i] > 0)) ? (
            <p className="mt-2 text-sm text-muted">
              Depois da primeira missão completa, o recorde aparece aqui.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {PLANETS.map((planet, i) => {
                const best = player.planetBestMs[i] ?? 0;
                if (best <= 0) return null;
                return (
                  <li key={planet.id} className="flex items-center justify-between py-2.5">
                    <span className="font-display">{planet.name}</span>
                    <span className="text-sm tabular-nums text-muted">{formatClock(best)}</span>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-lg">Últimos 14 dias</h2>
          <div className="mt-4 grid grid-cols-7 gap-2">
            {days.map((key) => {
              const d = player.days[key];
              const met = (d?.correct ?? 0) >= DAILY_GOAL;
              const some = (d?.correct ?? 0) > 0;
              return (
                <div key={key} className="text-center">
                  <div
                    className={cn(
                      "mx-auto h-8 w-8 rounded-sm border",
                      met
                        ? "border-accent bg-accent"
                        : some
                          ? "border-accent/30 bg-wash"
                          : "border-line bg-surface",
                    )}
                    title={`${key}: ${d?.correct ?? 0} acertos`}
                  />
                  <p className="mt-1 text-[10px] text-faint">{key.slice(8)}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card>
          <h2 className="font-display text-lg">Contas que pedem treino</h2>
          {weak.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              Ainda não há histórico suficiente. Depois de algumas missões, as
              contas mais teimosas aparecem aqui.
            </p>
          ) : (
            <ul className="mt-3 divide-y divide-line">
              {weak.map((row) => (
                <li
                  key={factKey(row.fact)}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="font-display text-lg tabular-nums">
                    {row.fact.a} {factOp(row.fact) === "div" ? "÷" : "×"} {row.fact.b}
                  </span>
                  <span className="text-sm tabular-nums text-muted">
                    {Math.round(row.accuracy * 100)}% · {Math.round(row.avgMs / 100) / 10}s
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card>
          <h2 className="font-display text-lg">Como o desafio cresce</h2>
          <ul className="mt-3 space-y-2 text-sm text-muted">
            <li>Doze planetas. Completar uma missão destrava o próximo e acende 1 a 3 estrelas.</li>
            <li>XP sobe a cada missão. O nível muda a nave (papel, Asa Teal, Nau-Coroa).</li>
            <li>Níveis 5, 10, 15, 20, 25 e 30, patente nova e prêmio: aviso no espaço dos pais.</li>
            <li>Tempo extra no painel: +15s por padrão. Dá para subir até +60s.</li>
            <li>Um pouco por dia: uma missão (15 acertos). A sequência conta dias seguidos.</li>
            <li>A patente no painel abaixo força o planeta daquela patente, se precisar.</li>
          </ul>
        </Card>

        <Link to="/" className="inline-flex">
          <Button variant="secondary">Voltar para o cadete</Button>
        </Link>
      </div>
    </AppShell>
  );
}
