import { createFileRoute, Link } from "@tanstack/react-router";
import { GROK_PROVIDERS, authEnabled, signIn } from "@/lib/auth/client";
import { Mascot } from "@/components/mascot";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/login")({ component: Login });

function Login() {
  return (
    <main className="paper-grid grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-md text-center">
        <Mascot className="mx-auto h-40 w-40" />
        <p className="mt-2 text-sm font-medium uppercase tracking-[0.14em] text-muted">
          Missão Tabuada
        </p>
        <h1 className="mt-2 font-display text-title">Entrar para salvar o progresso</h1>
        <p className="mt-3 text-muted">
          Pais entram aqui. Depois a criança joga no iPad, no computador ou no
          celular — a mesma conta, o mesmo treino.
        </p>
        <Card className="mt-8 space-y-3 p-5 text-left">
          {authEnabled ? (
            GROK_PROVIDERS.map((p) => (
              <Button
                key={p.providerId}
                type="button"
                variant={p.idp === "google" ? "primary" : "secondary"}
                size="lg"
                className="w-full"
                onClick={() => signIn(p.providerId, { callbackURL: "/" })}
              >
                Continuar com {p.label}
              </Button>
            ))
          ) : (
            <p className="text-sm text-muted">O acesso está desligado neste momento.</p>
          )}
        </Card>
        <Link
          to="/"
          className="mt-6 inline-block text-sm font-medium text-muted no-underline hover:text-ink"
        >
          Jogar neste aparelho, sem conta
        </Link>
      </div>
    </main>
  );
}
