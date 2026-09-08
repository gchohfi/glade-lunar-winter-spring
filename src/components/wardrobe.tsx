import { useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Coins,
  Flag,
  Gift,
  Lock,
  ShieldCheck,
  X,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { FieldScene } from "@/components/field-scene";
import { usePlayer } from "@/lib/game/store";
import { useCosmetics } from "@/components/use-cosmetics";
import { clubSummary } from "@/lib/game/club";
import {
  COSMETICS,
  cosmeticItem,
  cosmeticRequirement,
  cosmeticStatus,
  cosmeticUnlocked,
  type CosmeticItem,
} from "@/lib/game/wardrobe";
import { cn } from "@/lib/utils";

const STATUS = { equipped: "No meu jogo", unlocked: "Meu item", locked: "A conquistar" } as const;
const STORAGE_ERROR =
  "Não foi possível salvar neste aparelho. Nada foi alterado. Libere espaço e tente de novo.";

function WardrobeItem({ item }: { item: CosmeticItem }) {
  const state = usePlayer();
  const equipped = useCosmetics();
  const club = clubSummary(state);
  const [message, setMessage] = useState("");
  const [confirming, setConfirming] = useState(false);
  const status = cosmeticStatus(item, state);
  const paid = Boolean(item.cost);
  const locked = status === "locked";
  const cost = item.cost ?? 0;
  const missing = Math.max(0, cost - club.balance);
  const isGoal = club.goalItem?.id === item.id;
  const preview = { ...equipped, [item.kind === "ball" ? "ballId" : "fieldId"]: item.id };

  const equipOrBuy = () => {
    setMessage("");
    if (!locked) {
      const result = state.equipCosmetic(item.id);
      setMessage(
        result === "equipped"
          ? `${item.name} no seu jogo. Escolha salva neste aparelho.`
          : result === "storage-error"
            ? STORAGE_ERROR
            : "Esse item ainda não está disponível para equipar.",
      );
      return;
    }
    if (!confirming) {
      setConfirming(true);
      return;
    }
    const result = state.buyCosmetic(item.id);
    setConfirming(false);
    setMessage(
      result === "purchased"
        ? `${item.name} já faz parte da sua coleção. Compra salva. Agora você pode equipar no seu jogo.`
        : result === "storage-error"
          ? STORAGE_ERROR
          : result === "insufficient-coins"
            ? "O saldo mudou e ainda não cobre esse item. Suas moedas não foram gastas."
            : result === "owned"
              ? "Esse item já é seu. Você pode equipá-lo."
              : "Não foi possível comprar esse item. Suas moedas não foram gastas.",
    );
  };
  const chooseGoal = () => {
    const result = state.setCosmeticGoal(isGoal ? null : item.id);
    setMessage(
      result === "selected"
        ? `${item.name} é sua próxima conquista. Acompanhe na página do clube.`
        : result === "cleared"
          ? "Meta removida. Você pode escolher outra quando quiser."
          : result === "storage-error"
            ? STORAGE_ERROR
            : "Não foi possível salvar sua escolha. Tente novamente.",
    );
  };

  return (
    <Dialog.Root
      onOpenChange={() => {
        setMessage("");
        setConfirming(false);
      }}
    >
      <Card className="wardrobe-item club-shop-item" data-item-id={item.id} data-owned={!locked}>
        <div className="wardrobe-item-art" data-kind={item.kind}>
          <img src={item.art} alt="" data-cosmetic-id={item.id} loading="lazy" />
          {isGoal ? (
            <span className="club-item-goal">
              <Flag className="size-3" aria-hidden="true" />
              Minha meta
            </span>
          ) : null}
        </div>
        <div className="wardrobe-item-info">
          <span className="wardrobe-status" data-status={status}>
            {locked ? (
              paid ? (
                <Coins className="size-3" aria-hidden="true" />
              ) : (
                <Lock className="size-3" aria-hidden="true" />
              )
            ) : (
              <Check className="size-3" aria-hidden="true" />
            )}
            {locked && paid ? "Moedas do clube" : STATUS[status]}
          </span>
          <h3>{item.name}</h3>
          <p>
            {paid
              ? !locked
                ? "Já faz parte da sua coleção. Troque quando quiser."
                : `${cost} moedas · só visual`
              : cosmeticRequirement(item, !locked)}
          </p>
          <Dialog.Trigger asChild>
            <Button
              variant={isGoal ? "primary" : "secondary"}
              className="mt-3 w-full"
              aria-label={`Ver ${item.name}`}
              disabled={!state.hydrated}
            >
              {locked ? "Experimentar" : "Ver no campo"}
              <ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </Dialog.Trigger>
        </div>
      </Card>
      <Dialog.Portal>
        <Dialog.Overlay className="wardrobe-overlay" />
        <Dialog.Content className="wardrobe-dialog club-shop-dialog">
          <div className="wardrobe-dialog-heading">
            <div>
              <p className="match-eyebrow">
                {status === "equipped" ? "Já está no seu campo" : "Experimente no seu campo"}
              </p>
              <Dialog.Title>{item.name}</Dialog.Title>
            </div>
            <Dialog.Close asChild>
              <Button variant="ghost" className="match-exit" aria-label="Fechar detalhes">
                <X className="size-5" />
              </Button>
            </Dialog.Close>
          </div>
          <FieldScene appearance={preview} />
          <p className="wardrobe-preview-label">
            {status === "equipped"
              ? "Este item já faz parte do seu jogo."
              : "Prévia · nada mudou no seu jogo ainda."}
          </p>
          <Dialog.Description className="mt-4 text-sm text-muted">
            {item.description}
          </Dialog.Description>

          <div className="wardrobe-requirement">
            {locked && paid ? (
              <Coins className="size-5" aria-hidden="true" />
            ) : locked ? (
              <Lock className="size-5" aria-hidden="true" />
            ) : (
              <Gift className="size-5" aria-hidden="true" />
            )}
            <div>
              <strong>
                {locked
                  ? paid
                    ? `${cost} moedas do clube`
                    : cosmeticRequirement(item)
                  : STATUS[status]}
              </strong>
              <p>
                {locked && paid
                  ? `Seu saldo: ${club.balance} moedas. ${missing ? `Faltam ${missing} para comprar.` : "Você já pode escolher este item."}`
                  : "É só visual. Não muda o tempo, as contas ou o que você aprendeu."}
              </p>
            </div>
          </div>
          {locked && paid && confirming ? (
            <div className="club-purchase-confirm" role="status">
              <h3>Levar {item.name} para o clube?</h3>
              <p>
                Você usará <strong>{cost} moedas</strong> e ficará com{" "}
                <strong>{Math.max(0, club.balance - cost)}</strong>. Seu progresso de aprendizagem
                não muda.
              </p>
            </div>
          ) : null}

          <Button
            className="w-full"
            onClick={equipOrBuy}
            disabled={
              !state.hydrated || status === "equipped" || (locked && (!paid || missing > 0))
            }
          >
            {status === "equipped"
              ? "Equipado no meu jogo"
              : !locked
                ? "Equipar no meu jogo"
                : !paid
                  ? "Conclua a etapa para equipar"
                  : missing
                    ? `Faltam ${missing} moedas`
                    : confirming
                      ? `Confirmar compra · ${cost} moedas`
                      : `Comprar por ${cost} moedas`}
          </Button>
          {locked && paid ? (
            confirming ? (
              <Button variant="ghost" className="mt-2 w-full" onClick={() => setConfirming(false)}>
                Cancelar compra
              </Button>
            ) : (
              <Button
                variant="secondary"
                className="mt-2 w-full"
                onClick={chooseGoal}
                aria-pressed={isGoal}
                disabled={!state.hydrated}
              >
                <Flag className="size-4" aria-hidden="true" />
                {isGoal ? "Remover como minha meta" : "Quero conquistar este"}
              </Button>
            )
          ) : null}
          <p className="wardrobe-save-status" role="status" aria-live="polite">
            {message}
          </p>
          {locked && paid && !confirming ? (
            <p className="club-small-note">
              Uma partida completa rende 20 moedas. O foco da partida pode render mais 10. Cada
              recompensa, uma vez por dia.
            </p>
          ) : null}
          <Dialog.Close asChild>
            <Button variant="ghost" className="mt-2 w-full">
              Voltar à coleção
            </Button>
          </Dialog.Close>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export function Wardrobe() {
  const state = usePlayer();
  const equipped = useCosmetics();
  const club = clubSummary(state);
  const owned = COSMETICS.filter((item) => cosmeticUnlocked(item, state));
  return (
    <AppShell
      compact
      right={
        <Link to="/" className={cn(buttonVariants({ variant: "ghost" }), "no-underline")}>
          <ArrowLeft className="size-4" />
          Meu clube
        </Link>
      }
    >
      <div className="club-shop-header">
        <div className="wardrobe-heading">
          <p className="match-eyebrow">Colecione bons jogos. Escolha seu estilo.</p>
          <h1>
            Seu campo.
            <br />
            Do seu jeito.
          </h1>
          <p>Conquiste moedas jogando, experimente e escolha o que vem para o seu clube.</p>
        </div>
        <div className="club-wallet">
          <Coins aria-hidden="true" />
          <span>
            <strong>{state.hydrated ? club.balance : "—"}</strong>
            <small>moedas do clube</small>
          </span>
        </div>
      </div>
      <div className="wardrobe-workspace club-shop-workspace">
        <div className="club-shop-preview-column">
          <Card className="wardrobe-preview" aria-label="Meu equipamento em campo">
            <div className="wardrobe-preview-heading">
              <div>
                <p className="club-section-kicker">Vestiário do Nico</p>
                <h2>Assim você entra em campo</h2>
              </div>
              <span>
                {state.hydrated ? `${owned.length}/${COSMETICS.length} itens` : "Carregando…"}
              </span>
            </div>
            <FieldScene />
            <p className="wardrobe-preview-label">
              {cosmeticItem(equipped.ballId)?.name} · {cosmeticItem(equipped.fieldId)?.name}
            </p>
            <Link to="/play" className={cn(buttonVariants(), "mt-5 w-full no-underline")}>
              Jogar com meu time
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </Card>
          <div className="club-shop-goal">
            <p className="club-section-kicker">
              <Flag className="size-4" aria-hidden="true" />
              Minha próxima conquista
            </p>
            <h2>{club.goalItem?.name ?? "Qual é a sua favorita?"}</h2>
            <p>
              {club.goalItem
                ? club.goalRemaining
                  ? `Faltam ${club.goalRemaining} moedas. Cada partida de um novo dia aproxima você.`
                  : "Seu saldo já alcançou essa meta. Experimente e confirme sua compra."
                : "Experimente qualquer item e toque em “Quero conquistar este”. Você escolhe o seu objetivo."}
            </p>
            {club.goalItem ? (
              <Progress className="mt-4" value={club.goalProgress} max={100} />
            ) : null}
          </div>
          <div className="club-shop-promise">
            <ShieldCheck className="size-5" aria-hidden="true" />
            <p>
              Sem dinheiro real, sorteios ou itens que deixam as contas mais fáceis. Seu aprendizado
              nunca é gasto.
            </p>
          </div>
        </div>
        <Tabs.Root defaultValue="collection" className="wardrobe-collection">
          <Tabs.List className="wardrobe-tabs" aria-label="Itens do Vestiário">
            <Tabs.Trigger asChild value="collection">
              <Button variant="ghost">Coleção completa</Button>
            </Tabs.Trigger>
            <Tabs.Trigger asChild value="owned">
              <Button variant="ghost">Meus itens · {owned.length}</Button>
            </Tabs.Trigger>
          </Tabs.List>
          {[
            { id: "collection", items: COSMETICS },
            { id: "owned", items: owned },
          ].map((tab) => (
            <Tabs.Content key={tab.id} value={tab.id} className="wardrobe-tab-content">
              {(
                [
                  {
                    kind: "ball",
                    label: "Uma bola com a sua cara",
                    note: "Do primeiro passe ao gol.",
                  },
                  {
                    kind: "field",
                    label: "O palco dos seus jogos",
                    note: "Um novo clima para o mesmo time.",
                  },
                ] as const
              ).map((group) => (
                <section
                  key={group.kind}
                  className="wardrobe-group"
                  aria-label={group.kind === "ball" ? "Bolas" : "Campos"}
                >
                  <h2>{group.label}</h2>
                  <p className="club-collection-note">{group.note}</p>
                  <div className="wardrobe-grid">
                    {tab.items
                      .filter((item) => item.kind === group.kind)
                      .map((item) => (
                        <WardrobeItem key={item.id} item={item} />
                      ))}
                  </div>
                </section>
              ))}
            </Tabs.Content>
          ))}
        </Tabs.Root>
      </div>
      <p className="club-shop-footer">
        Suas compras e escolhas ficam salvas neste aparelho. Você pode trocar os itens equipados
        quando quiser. O Nico continua sendo o mesmo companheiro de time.
      </p>
    </AppShell>
  );
}
