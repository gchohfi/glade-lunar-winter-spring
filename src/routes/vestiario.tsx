import { createFileRoute } from "@tanstack/react-router";
import { Wardrobe } from "@/components/wardrobe";

export const Route = createFileRoute("/vestiario")({ component: Wardrobe });
