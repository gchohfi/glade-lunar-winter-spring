import { createFileRoute } from "@tanstack/react-router";
import { MazePlay } from "@/components/maze-play";

export const Route = createFileRoute("/labirinto")({ component: MazePlay });
