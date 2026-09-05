import { useState } from "react";
import { Flag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MascotScene } from "@/components/mascot-scene";
import { persistCloud } from "@/components/cloud-sync";
import { usePlayer } from "@/lib/game/store";
import { unlockAudio } from "@/lib/game/audio";

export function Onboarding() {
  const finish = usePlayer((s) => s.finishOnboarding);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");

  return (
    <div className="nico-onboarding mx-auto flex max-w-xl flex-col items-center text-center">
      <p className="font-display text-lg">Missão Tabuada</p>
      <MascotScene
        mood={step === 0 ? "idle" : "guide"}
        className="nico-scene-onboarding"
        priority
      />
      {step === 0 ? (
        <div className="anim-rise mt-2 space-y-4">
          <p className="text-sm font-medium uppercase tracking-[0.14em] text-muted">
            Futebol com Nico
          </p>
          <h1 className="font-display text-title">Bora jogar no mesmo time?</h1>
          <p className="text-muted">
            Eu sou o Nico! Você resolve as contas, a bola avança. Dois passes e um chute fazem um
            gol. São quinze acertos, cinco gols e um treino por dia, com tabuadas do 3 ao 13.
          </p>
          <p className="text-xs text-muted">
            Sem ranking público, anúncios ou chat. A conta é administrada por um adulto.
          </p>
          <Button
            size="lg"
            className="mt-2 w-full"
            onClick={() => {
              unlockAudio();
              setStep(1);
            }}
          >
            Quero entrar no time
          </Button>
        </div>
      ) : (
        <form
          className="anim-rise mt-2 w-full space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            unlockAudio();
            finish(name || "Jogador");
            persistCloud();
          }}
        >
          <h1 className="font-display text-title">Como te chamamos?</h1>
          <p className="text-muted">
            Pode ser só o primeiro nome. Quero saber quem vai jogar comigo.
          </p>
          <Input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            maxLength={24}
            aria-label="Nome do jogador"
          />
          <Button size="lg" className="w-full" type="submit">
            <Flag className="size-5" strokeWidth={2} />
            Entrar em campo
          </Button>
        </form>
      )}
    </div>
  );
}
