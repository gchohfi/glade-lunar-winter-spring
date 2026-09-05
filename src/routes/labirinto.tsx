import { createFileRoute, Link } from "@tanstack/react-router";
import { buttonVariants } from "@/components/ui/button";

// The exported repository does not include maze-play. Keep this route honest
// and navigable without blocking the rest of the application at build time.
export const Route = createFileRoute("/labirinto")({ component: MazeUnavailable });

function MazeUnavailable() {
  return (
    <main className="paper-grid grid min-h-dvh place-items-center p-6">
      <div className="max-w-md space-y-4 text-center">
        <h1 className="font-display text-title">Labirinto em preparação</h1>
        <p className="text-muted">
          Este modo ainda não está disponível. Seu treino com Nico continua esperando por você.
        </p>
        <Link to="/" className={buttonVariants()}>
          Voltar ao campo
        </Link>
      </div>
    </main>
  );
}
