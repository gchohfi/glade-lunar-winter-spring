import { useState } from "react";
import { Link } from "@tanstack/react-router";
import * as Dialog from "@radix-ui/react-dialog";
import * as Tabs from "@radix-ui/react-tabs";
import { ArrowLeft, Check, Gift, Lock, X } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { FieldScene } from "@/components/field-scene";
import { usePlayer } from "@/lib/game/store";
import { useCosmetics } from "@/components/use-cosmetics";
import {
  COSMETICS,
  cosmeticItem,
  cosmeticRequirement,
  cosmeticStatus,
  cosmeticUnlocked,
  type CosmeticItem,
} from "@/lib/game/wardrobe";
import { cn } from "@/lib/utils";

const STATUS = { equipped: "Equipado", unlocked: "Conquistado", locked: "A conquistar" } as const;

function WardrobeItem({ item }: { item: CosmeticItem }) {
  const state = usePlayer();
  const equipped = useCosmetics();
  const [message, setMessage] = useState("");
  const status = cosmeticStatus(item, state);
  const preview = { ...equipped, [item.kind === "ball" ? "ballId" : "fieldId"]: item.id };
  const equip = () => {
    const result = state.equipCosmetic(item.id);
    setMessage(
      result === "equipped"
        ? `${item.name} no seu jogo. Escolha salva neste aparelho.`
        : result === "storage-error"
          ? "Não foi possível salvar neste aparelho. Libere espaço e tente de novo."
          : "Esse item ainda não está disponível para equipar.",
    );
  };
  return (
    <Dialog.Root onOpenChange={() => setMessage("")}>
      <Card className="wardrobe-item" data-item-id={item.id}>
        <div className="wardrobe-item-art" data-kind={item.kind}>
          <img src={item.art} alt="" loading="lazy" />
        </div>
        <div className="wardrobe-item-info">
          <span className="wardrobe-status" data-status={status}>
            {status === "locked" ? (
              <Lock className="size-3" aria-hidden="true" />
            ) : (
              <Check className="size-3" aria-hidden="true" />
            )}
            {STATUS[status]}
          </span>
          <h3>{item.name}</h3>
          <p>{cosmeticRequirement(item, status !== "locked")}</p>
          <Dialog.Trigger asChild>
            <Button
              variant="secondary"
              className="mt-4 w-full"
              aria-label={`Ver ${item.name}`}
              disabled={!state.hydrated}
            >
              Ver no campo
            </Button>
          </Dialog.Trigger>
        </div>
      </Card>
      <Dialog.Portal>
        <Dialog.Overlay className="wardrobe-overlay" />
        <Dialog.Content className="wardrobe-dialog">
          <div className="wardrobe-dialog-heading">
            <div>
              <p className="match-eyebrow">
                {status === "equipped" ? "Seu equipamento" : "Experimente no campo"}
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
              : "Prévia · nada foi alterado no seu jogo."}
          </p>
          <Dialog.Description className="mt-4 text-sm text-muted">
            {item.description}
          </Dialog.Description>
          <div className="wardrobe-requirement">
            {status === "locked" ? (
              <Lock className="size-4" aria-hidden="true" />
            ) : (
              <Gift className="size-4" aria-hidden="true" />
            )}
            <div>
              <strong>{status === "locked" ? cosmeticRequirement(item) : STATUS[status]}</strong>
              <p>É só visual. Não muda o tempo, as contas ou o XP.</p>
            </div>
          </div>
          <Button
            className="w-full"
            onClick={equip}
            disabled={!state.hydrated || status !== "unlocked"}
          >
            {status === "locked"
              ? "Conclua a etapa para equipar"
              : status === "equipped"
                ? "Equipado"
                : "Equipar no meu jogo"}
          </Button>
          <p className="wardrobe-save-status" role="status" aria-live="polite">
            {message}
          </p>
          <Dialog.Close asChild>
            <Button variant="ghost" className="w-full">
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
  const owned = COSMETICS.filter((item) => cosmeticUnlocked(item, state));
  return (
    <AppShell
      compact
      right={
        <Link
          to="/"
          className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "no-underline")}
        >
          <ArrowLeft className="size-4" /> Campeonato
        </Link>
      }
    >
      <div className="wardrobe-heading">
        <p className="match-eyebrow">Seu time, do seu jeito</p>
        <h1>Vestiário do Nico</h1>
        <p>
          Conquiste itens pelo caminho e escolha como entrar em campo. Sem compras, sem gastar XP.
        </p>
      </div>
      <div className="wardrobe-workspace">
        <Card className="wardrobe-preview" aria-label="Meu equipamento em campo">
          <div className="wardrobe-preview-heading">
            <h2>Pronto para jogar</h2>
            <span>
              {state.hydrated
                ? `${owned.length}/${COSMETICS.length} itens conquistados`
                : "Carregando seu equipamento…"}
            </span>
          </div>
          <FieldScene />
          <p className="wardrobe-preview-label">
            {cosmeticItem(equipped.ballId)?.name} · {cosmeticItem(equipped.fieldId)?.name}
          </p>
        </Card>
        <Tabs.Root defaultValue="collection" className="wardrobe-collection">
          <Tabs.List className="wardrobe-tabs" aria-label="Itens do Vestiário">
            <Tabs.Trigger asChild value="collection">
              <Button variant="ghost">Coleção completa</Button>
            </Tabs.Trigger>
            <Tabs.Trigger asChild value="owned">
              <Button variant="ghost">Meus itens</Button>
            </Tabs.Trigger>
          </Tabs.List>
          {[
            { id: "collection", items: COSMETICS },
            { id: "owned", items: owned },
          ].map((tab) => (
            <Tabs.Content key={tab.id} value={tab.id} className="wardrobe-tab-content">
              {(
                [
                  { kind: "ball", label: "Bolas" },
                  { kind: "field", label: "Campos" },
                ] as const
              ).map((group) => (
                <section key={group.kind} className="wardrobe-group" aria-label={group.label}>
                  <h2>{group.label}</h2>
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
      <p className="mt-6 text-sm text-muted">
        Suas escolhas ficam salvas neste aparelho. Você pode trocar de volta quando quiser. O Nico
        continua sendo o mesmo companheiro de time.
      </p>
      <Link to="/" className={cn(buttonVariants(), "mt-5 no-underline")}>
        <ArrowLeft className="size-4" /> Voltar ao campeonato
      </Link>
    </AppShell>
  );
}
