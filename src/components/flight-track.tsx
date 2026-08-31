import { TARGET_CORRECT } from "@/lib/game/types";

export function FlightTrack({
  correct,
  combo,
  shipArt,
  planetArt,
}: {
  correct: number;
  combo: number;
  shipArt: string;
  planetArt: string;
}) {
  const pct = Math.min(1, correct / TARGET_CORRECT);
  return (
    <div className="relative mt-4 h-14">
      <div className="absolute inset-x-12 top-7 h-1 rounded-full bg-line" />
      <div
        className="absolute top-7 left-12 h-1 rounded-full bg-accent transition-[width] duration-200"
        style={{ width: `calc((100% - 6rem) * ${pct})` }}
      />
      <img
        src={shipArt}
        alt=""
        className="pointer-events-none absolute top-1 h-11 w-11 -translate-x-1/2 rounded-full bg-bg object-cover shadow-soft transition-[left] duration-300"
        style={{ left: `calc(3rem + (100% - 6rem) * ${pct})` }}
        draggable={false}
      />
      <img
        src={planetArt}
        alt=""
        className="pointer-events-none absolute right-0 top-0.5 h-12 w-12 rounded-full object-cover shadow-soft"
        draggable={false}
      />
      {combo >= 2 ? (
        <p className="absolute -top-1 left-1/2 -translate-x-1/2 rounded-full border border-accent/20 bg-wash px-2 py-0.5 font-display text-xs text-accent">
          Combo ×{combo}
        </p>
      ) : null}
    </div>
  );
}
