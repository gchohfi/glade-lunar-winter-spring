import { cn } from "@/lib/utils";

type Mood = "idle" | "win" | "try";

const SRC: Record<Mood, string> = {
  idle: "/mascot.jpg",
  win: "/mascot-win.jpg",
  try: "/mascot-try.jpg",
};

export function Mascot({
  mood = "idle",
  className,
  alt = "Nico, o cadete onça da Missão Tabuada",
}: {
  mood?: Mood;
  className?: string;
  alt?: string;
}) {
  return (
    <img
      src={SRC[mood]}
      alt={alt}
      className={cn("pointer-events-none select-none object-contain", className)}
      draggable={false}
    />
  );
}
