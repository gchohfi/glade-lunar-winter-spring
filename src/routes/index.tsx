import { createFileRoute } from "@tanstack/react-router";
import { HomeDashboard } from "@/components/home-dashboard";
import { Onboarding } from "@/components/onboarding";
import { AppShell } from "@/components/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { usePlayer } from "@/lib/game/store";

export const Route = createFileRoute("/")({ component: Home });

function Home() {
  const hydrated = usePlayer((s) => s.hydrated);
  const onboarded = usePlayer((s) => s.onboarded);

  if (!hydrated) {
    return (
      <AppShell>
        <div className="space-y-4">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-32 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </AppShell>
    );
  }

  if (!onboarded) {
    return (
      <div className="paper-grid min-h-dvh px-4 py-10">
        <Onboarding />
      </div>
    );
  }

  return <HomeDashboard />;
}
