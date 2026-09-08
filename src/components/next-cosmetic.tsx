import { Link } from "@tanstack/react-router";
import { ArrowRight, Coins, Flag, ShoppingBag } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { usePlayer } from "@/lib/game/store";
import { clubSummary } from "@/lib/game/club";
import { COSMETICS, cosmeticRequirement, cosmeticUnlocked } from "@/lib/game/wardrobe";
import { cn } from "@/lib/utils";

export function NextCosmetic() {
  const state = usePlayer();
  const club = clubSummary(state);
  const next =
    club.goalItem ??
    COSMETICS.find((item) => item.cost && !cosmeticUnlocked(item, state)) ??
    COSMETICS.find((item) => !cosmeticUnlocked(item, state));
  const chosen = Boolean(club.goalItem);
  const cost = next?.cost ?? 0;
  const remaining = Math.max(0, cost - club.balance);
  return (
    <section className="club-goal" aria-labelledby="club-goal-title">
      <div className="club-section-kicker">
        <Flag className="size-4" aria-hidden="true" />
        {chosen
          ? "Você escolheu conquistar"
          : next
            ? "Qual vai ser sua próxima conquista?"
            : "Seu clube, do seu jeito"}
      </div>
      <div className="club-goal-showcase">
        <div className="club-goal-art" data-kind={next?.kind}>
          {next ? (
            <img src={next.art} data-cosmetic-id={next.id} alt="" loading="lazy" />
          ) : (
            <ShoppingBag aria-hidden="true" />
          )}
        </div>
        <div>
          <h2 id="club-goal-title">{next?.name ?? "Coleção completa"}</h2>
          <p>
            {next
              ? !next.cost
                ? cosmeticRequirement(next)
                : chosen
                  ? "Treine, junte moedas e leve para o seu campo."
                  : "Escolha no Vestiário. O caminho aparece aqui."
              : "Seus favoritos já podem entrar em campo."}
          </p>
        </div>
      </div>
      {next?.cost ? (
        <div className="club-goal-progress">
          <div>
            <span>
              <Coins className="size-4" aria-hidden="true" />
              {Math.min(club.balance, cost)} de {cost} moedas
            </span>
            <strong>{remaining ? `Faltam ${remaining}` : "Já dá para comprar"}</strong>
          </div>
          <Progress value={Math.min(club.balance, cost)} max={cost || 1} />
        </div>
      ) : null}
      <Link
        to="/vestiario"
        className={cn(buttonVariants({ variant: "secondary" }), "w-full no-underline")}
      >
        {chosen
          ? remaining
            ? "Experimentar no meu campo"
            : "Comprar no Vestiário"
          : next
            ? "Escolher minha conquista"
            : "Ver meus itens"}
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
      <p className="club-small-note">Sem dinheiro real. O que você aprendeu nunca é gasto.</p>
    </section>
  );
}
