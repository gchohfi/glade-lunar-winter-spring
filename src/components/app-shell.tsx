import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function AppShell({
  children,
  right,
  compact,
}: {
  children: ReactNode;
  right?: ReactNode;
  compact?: boolean;
}) {
  return (
    <div className="paper-grid min-h-dvh">
      <div
        className={cn(
          "mx-auto flex min-h-dvh w-full max-w-3xl flex-col px-4 pb-10 safe-top sm:px-6",
          compact && "max-w-5xl",
        )}
      >
        <header className="mb-6 flex items-center justify-between gap-3">
          <Link
            to="/"
            className="font-display text-lg tracking-tight text-ink no-underline"
          >
            Missão Tabuada
          </Link>
          {right}
        </header>
        <div className="flex-1">{children}</div>
      </div>
    </div>
  );
}
