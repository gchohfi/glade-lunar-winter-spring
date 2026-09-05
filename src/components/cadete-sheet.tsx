import { Trophy } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Mascot } from "@/components/mascot";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  formatPct,
  formatSec,
  sheetFromPlayer,
  type CadeteSheetData,
} from "@/lib/game/cadete-sheet";
import { usePlayer } from "@/lib/game/store";
import { formatClock } from "@/lib/game/types";
import { cn } from "@/lib/utils";

function StatsRow({ sheet }: { sheet: CadeteSheetData }) {
  const items = [
    { label: "Precisão", value: formatPct(sheet.stats.precisao) },
    { label: "Velocidade", value: formatSec(sheet.stats.velocidade) },
    { label: "Foco", value: formatPct(sheet.stats.foco) },
    { label: "Resiliência", value: formatPct(sheet.stats.resiliencia) },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {items.map((item) => (
        <div key={item.label} className="rounded-md border border-line bg-surface px-3 py-2">
          <p className="text-xs text-muted">{item.label}</p>
          <p className="font-display text-lg tabular-nums">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

export function CadeteSheet({ compact = false }: { compact?: boolean }) {
  const player = usePlayer();
  const sheet = sheetFromPlayer(player);

  return (
    <Card className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <Mascot mood={sheet.hojeFeito ? "win" : "idle"} className="h-16 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-muted">Ficha do jogador</p>
          <h2 className="font-display text-2xl">{sheet.nome}</h2>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge className="border-accent/20 bg-wash text-accent">Nível {sheet.nivel}</Badge>
            <Badge>{sheet.patenteNome}</Badge>
            <Badge>{sheet.planetaNome}</Badge>
            {sheet.streak > 0 ? <Badge>{sheet.streak} dias</Badge> : null}
          </div>
        </div>
        <Trophy className="hidden size-12 text-accent sm:block" aria-label={sheet.naveAtual} />
      </div>
      <div>
        <p className="text-sm text-muted">
          Nível {sheet.nivel} · faltam {sheet.faltamXp}
          {sheet.proximaNave ? ` · ${sheet.proximaNave}` : ""}
        </p>
        <Progress className="mt-2" value={sheet.xp} max={sheet.xpParaProximo} />
      </div>
      <StatsRow sheet={sheet} />
      {compact ? (
        <p className="text-sm text-muted">
          {sheet.hojeFeito ? "Hoje está feito." : `${sheet.acertosHoje}/15 acertos hoje.`}{" "}
          Conquista: {sheet.naveAtual}.
        </p>
      ) : (
        <>
          <div>
            <h3 className="font-display text-lg">Conquistas</h3>
            <ul className="mt-2 divide-y divide-line">
              {sheet.frota.map((nave) => (
                <li key={nave.id} className="flex items-center justify-between py-2">
                  <span className={nave.unlocked ? "text-ink" : "text-faint"}>{nave.nome}</span>
                  <span className="text-sm text-muted">
                    {nave.atual ? "atual" : `nível ${nave.minLevel}`}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg">Etapas</h3>
            <ul className="mt-2 flex flex-wrap gap-2">
              {sheet.planetas.map((p) => (
                <Badge
                  key={p.id}
                  className={cn(
                    p.atual && "border-accent/20 bg-wash text-accent",
                    !p.unlocked && "opacity-40",
                  )}
                >
                  {p.nome}
                  {p.stars > 0 ? ` · ${p.stars}★` : ""}
                </Badge>
              ))}
            </ul>
          </div>
          <div>
            <h3 className="font-display text-lg">Prêmio</h3>
            <p className="mt-1 text-sm text-muted">
              {sheet.premio.pronto
                ? `Hora de ${sheet.premio.nome}.`
                : `${sheet.premio.ciclo}/${sheet.premio.aCada} · ${sheet.premio.nome}`}
            </p>
          </div>
          {sheet.historico.length > 0 ? (
            <div>
              <h3 className="font-display text-lg">Últimas partidas</h3>
              <ul className="mt-2 divide-y divide-line">
                {sheet.historico.slice(0, 6).map((m) => (
                  <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-display">
                      {m.passou ? "Vitória" : "Quase"} · {m.acertos} acertos
                    </span>
                    <span className="tabular-nums text-muted">{formatClock(m.tempoMs)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <Link to="/" className="inline-flex text-sm font-medium text-accent no-underline">
            Ver partidas
          </Link>
        </>
      )}
    </Card>
  );
}
