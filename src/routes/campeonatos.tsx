import { createFileRoute } from "@tanstack/react-router";
import { ChampionshipsPage } from "@/components/championships-page";

export const Route = createFileRoute("/campeonatos")({ component: ChampionshipsPage });
