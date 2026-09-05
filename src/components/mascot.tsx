import { cn } from "@/lib/utils";

export type MascotMood = "idle" | "guide" | "win" | "try";

const SRC: Record<MascotMood, string> = {
  idle: "/mascots/nico-leao/welcome.webp",
  guide: "/mascots/nico-leao/guide.webp",
  win: "/mascots/nico-leao/celebrate.webp",
  try: "/mascots/nico-leao/encourage.webp",
};

const DESCRIPTION: Record<MascotMood, string> = {
  idle: "Nico, o leão da Missão Tabuada, dando boas-vindas",
  guide: "Nico apontando para o próximo lance no campo",
  win: "Nico comemorando a conquista com você",
  try: "Nico incentivando você a tentar de novo",
};

export function Mascot({
  mood = "idle",
  className,
  alt,
  priority = false,
}: {
  mood?: MascotMood;
  className?: string;
  alt?: string;
  priority?: boolean;
}) {
  return (
    <img
      src={SRC[mood]}
      alt={alt ?? DESCRIPTION[mood]}
      width={512}
      height={640}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      data-mascot="nico-leao"
      data-mood={mood}
      className={cn("pointer-events-none select-none object-contain", className)}
      draggable={false}
    />
  );
}
