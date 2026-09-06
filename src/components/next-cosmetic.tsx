import { Link } from "@tanstack/react-router";
import { Gift } from "lucide-react";
import { Card } from "@/components/ui/card";
import { buttonVariants } from "@/components/ui/button";
import { usePlayer } from "@/lib/game/store";
import { nextCosmetic, cosmeticRequirement } from "@/lib/game/wardrobe";
import { cn } from "@/lib/utils";

export function NextCosmetic() {
  const planetStars = usePlayer((s) => s.planetStars);
  const next = nextCosmetic({ planetStars });
  return (
    <Card className="next-cosmetic">
      {next ? (
        <img src={next.art} alt="" data-kind={next.kind} />
      ) : (
        <Gift className="size-8 text-accent" aria-hidden="true" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-accent">
          {next ? "Próxima conquista" : "Coleção completa"}
        </p>
        <h2 className="mt-1 text-lg">{next?.name ?? "Seu equipamento está no Vestiário"}</h2>
        <p className="mt-1 text-sm text-muted">
          {next ? cosmeticRequirement(next) : "Escolha seus favoritos para a próxima partida."}
        </p>
      </div>
      <Link
        to="/vestiario"
        className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "no-underline")}
      >
        Ver no Vestiário
      </Link>
    </Card>
  );
}
