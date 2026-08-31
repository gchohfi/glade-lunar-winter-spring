import { useState } from "react";
import { Rocket } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Mascot } from "@/components/mascot";
import { persistCloud } from "@/components/cloud-sync";
import { usePlayer } from "@/lib/game/store";
import { unlockAudio } from "@/lib/game/audio";

export function Onboarding() {
  const finish = usePlayer((s) => s.finishOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");

  return (
    <div className="mx-auto flex max-w-md flex-col items-center text-center">
      <Mascot className="h-52 w-52" />
      {step === 0 ? (
        <div className="anim-rise mt-2 space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">
            Academia de voo
          </p>
          <h1 className="font-display text-title">Olá, cadete.</h1>
          <p className="text-muted">
            Eu sou o Nico. Um pouquinho por dia: uma missão, quinze acertos,
            uns três minutos. Doze planetas, contas do 3 ao 13 com vezes e
            divisão, e a cada dia a sequência cresce.
          </p>
          <Button
            size="lg"
            className="mt-2 w-full"
            onClick={() => {
              unlockAudio();
              setStep(1);
            }}
          >
            Quero entrar na missão
          </Button>
        </div>
      ) : (
        <form
          className="anim-rise mt-2 w-full space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            unlockAudio();
            finish(name || "Cadete");
            persistCloud();
          }}
        >
          <h1 className="font-display text-title">Como te chamamos?</h1>
          <p className="text-muted">Pode ser só o primeiro nome.</p>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            maxLength={24}
            aria-label="Nome do cadete"
          />
          <Button size="lg" className="w-full" type="submit">
            <Rocket className="size-5" strokeWidth={2} />
            Começar
          </Button>
        </form>
      )}
    </div>
  );
}
