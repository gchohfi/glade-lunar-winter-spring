import { Delete, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", "ok"] as const;

export function NumberPad({
  onDigit,
  onBack,
  onSubmit,
  disabled,
}: {
  onDigit: (d: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {KEYS.map((key) => {
        const isAction = key === "back" || key === "ok";
        return (
          <button
            key={key}
            type="button"
            disabled={disabled}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              if (key === "back") onBack();
              else if (key === "ok") onSubmit();
              else onDigit(key);
            }}
            className={cn(
              "flex h-16 items-center justify-center rounded-md border text-2xl font-display transition-[transform,background-color] duration-150 ease-out touch-manipulation active:not-disabled:scale-[0.96] disabled:opacity-40",
              isAction
                ? "border-line bg-wash text-ink"
                : "border-line bg-surface text-ink hover:bg-wash",
              key === "ok" && "bg-accent text-accent-fg hover:bg-accent",
            )}
            aria-label={key === "back" ? "Apagar" : key === "ok" ? "Confirmar" : key}
          >
            {key === "back" ? (
              <Delete className="size-6" strokeWidth={2} />
            ) : key === "ok" ? (
              <CornerDownLeft className="size-6" strokeWidth={2} />
            ) : (
              key
            )}
          </button>
        );
      })}
    </div>
  );
}
