import type { ErrorComponentProps } from "@tanstack/react-router";
import { TriangleAlert } from "lucide-react";

export function AppErrorComponent({ error }: ErrorComponentProps) {
  return (
    <main
      className={
        "flex min-h-screen flex-col items-center justify-center gap-3 px-6 text-center " +
        "bg-bg text-ink"
      }
    >
      <span className="text-bad" aria-hidden="true">
        <TriangleAlert className="size-10" strokeWidth={2} />
      </span>
      <h1 className="font-display text-lg">Algo deu errado</h1>
      <p className="max-w-md text-sm break-words text-muted">
        {error.message || "Tente recarregar a página."}
      </p>
    </main>
  );
}
