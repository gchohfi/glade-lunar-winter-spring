import { Link } from "@tanstack/react-router";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { weeklyLearning } from "@/lib/game/learning";
import { learningEvidence } from "@/lib/game/coaching";
import { usePlayer } from "@/lib/game/store";
import { formatClock } from "@/lib/game/types";
import { cn } from "@/lib/utils";

export function LearningSummary() {
  const player = usePlayer();
  const { current, previous } = weeklyLearning(player);
  const evidence = learningEvidence(player);
  const accuracy = (value: number | null) => (value === null ? "Sem respostas" : `${value}%`);
  const time = (value: number | null) =>
    value === null ? "Sem partidas completas" : formatClock(value);
  return (
    <Card>
      <h2 className="font-display text-lg">Como o aprendizado está caminhando</h2>
      <p className="mt-2 text-sm text-muted">
        Últimos 7 dias, incluindo hoje, comparados aos 7 anteriores.
      </p>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {[
          { label: "Últimos 7 dias", stats: current },
          { label: "7 dias anteriores", stats: previous },
        ].map(({ label, stats }) => (
          <div key={label} className="min-w-0 rounded-md border border-line p-3">
            <h3 className="text-sm text-muted">{label}</h3>
            <p className="mt-3 text-xs text-muted">Acertos na prática</p>
            <p className="font-display text-lg">{accuracy(stats.accuracy)}</p>
            <p className="text-xs text-muted">{stats.answered} respostas</p>
            <p className="mt-3 text-xs text-muted">Partidas completas</p>
            <p className="font-display text-lg">{stats.missions}</p>
            <p className="mt-3 text-xs text-muted">Tempo médio por partida completa</p>
            <p className="mt-1 font-display text-sm">{time(stats.averageMs)}</p>
            <p className="text-xs text-muted">{stats.timedSamples} no histórico</p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-muted">
        A dificuldade pode mudar entre etapas; menor tempo não significa, sozinho, maior domínio. O
        tempo usa até 60 partidas guardadas. Respostas com ajuda dentro das partidas entram no
        volume de prática. A evidência sem ajuda aparece separada abaixo.
      </p>
      <div className="mt-4 rounded-md border border-line p-4">
        <h3 className="font-display">O que ficou na memória</h3>
        <p className="mt-2 text-sm">
          {evidence.returning} contas certas na primeira tentativa em pelo menos dois dias
          diferentes; {evidence.reinforced} em três ou mais dias.
        </p>
        <p className="mt-2 text-xs text-muted">
          Esse registro começa nesta versão. Correções após ver a resposta e o treino assistido não
          contam como evidência independente. Não é um diagnóstico de domínio.
        </p>
      </div>
      <Link
        to="/treino"
        className={cn(buttonVariants({ variant: "secondary" }), "mt-4 w-full no-underline")}
      >
        Treinar com Nico
      </Link>
    </Card>
  );
}
