import { Fragment } from "react";
import { masteryGrid, type MasteryCell, type MasteryTier } from "@/lib/game/mastery";
import type { PlayerState } from "@/lib/game/types";
import { cn } from "@/lib/utils";

const TIER_STYLE: Record<MasteryTier, string> = {
  fluente: "border-accent bg-accent",
  quase: "border-accent/40 bg-accent/35",
  aprendendo: "border-accent/30 bg-wash",
  novo: "border-line bg-surface",
};

const TIER_LABEL: Record<MasteryTier, string> = {
  fluente: "Fluente",
  quase: "Quase lá",
  aprendendo: "Aprendendo",
  novo: "Nova",
};

function cellTitle(cell: MasteryCell): string {
  const { a, b } = cell.fact;
  if (!cell.stat || cell.stat.attempts === 0) return `${a} × ${b}: ainda não apareceu`;
  const acc = Math.round((cell.stat.correct / cell.stat.attempts) * 100);
  return `${a} × ${b}: ${cell.stat.attempts} tentativa${cell.stat.attempts === 1 ? "" : "s"}, ${acc}% de acerto`;
}

export function MasteryGrid({
  state,
  compact = false,
}: {
  state: PlayerState;
  compact?: boolean;
}) {
  const rows = masteryGrid(state);
  return (
    <div className="space-y-3">
      <div
        className={cn(
          "grid grid-cols-[auto_repeat(12,minmax(0,1fr))]",
          compact ? "gap-0.5" : "gap-1",
        )}
        role="img"
        aria-label="Domínio por conta da tabuada"
      >
        <span />
        {rows[0].cells.map((cell) => (
          <span
            key={cell.fact.b}
            className="text-center text-[10px] tabular-nums text-faint"
          >
            {cell.fact.b}
          </span>
        ))}
        {rows.map((row) => (
          <Fragment key={row.table}>
            <span className="self-center pr-1.5 text-right font-display text-sm leading-none text-muted">
              {row.table}×
            </span>
            {row.cells.map((cell) => (
              <div
                key={cell.key}
                title={cellTitle(cell)}
                className={cn("aspect-square rounded-sm border", TIER_STYLE[cell.tier])}
              />
            ))}
          </Fragment>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
        {(Object.keys(TIER_LABEL) as MasteryTier[]).map((tier) => (
          <span key={tier} className="inline-flex items-center gap-1.5 text-xs text-muted">
            <span className={cn("size-3 rounded-sm border", TIER_STYLE[tier])} />
            {TIER_LABEL[tier]}
          </span>
        ))}
      </div>
    </div>
  );
}
