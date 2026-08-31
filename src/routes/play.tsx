import { createFileRoute } from "@tanstack/react-router";
import { MissionPlay } from "@/components/mission-play";

export const Route = createFileRoute("/play")({ component: MissionPlay });
