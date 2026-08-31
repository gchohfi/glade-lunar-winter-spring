import { createFileRoute } from "@tanstack/react-router";
import { ParentPanel } from "@/components/parent-panel";

export const Route = createFileRoute("/pais")({ component: ParentPanel });
