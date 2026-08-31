import { Delete, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "back", "0", ","] as const;

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
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2">
        {KEYS.map((key) => {
          const isAction = key === "back" || key === ",";
          return (
            <button
              key={key}
              type="button"
              disabled={disabled}
              onPointerDown={(e) => e.preventDefault()}
              onClick={() => {
                if (key === "back") onBack();
                else onDigit(key);
              }}
              className={cn(
                "flex h-16 items-center justify-center rounded-md border text-2xl font-display transition-[transform,background-color] duration-150 ease-out touch-manipulation active:not-disabled:scale-[0.96] disabled:opacity-40",
                isAction
                  ? "border-line bg-wash text-ink"
                  : "border-line bg-surface text-ink hover:bg-wash",
              )}
              aria-label={key === "back" ? "Apagar" : key === "," ? "Vírgula" : key}
            >
              {key === "back" ? <Delete className="size-6" strokeWidth={2} /> : key}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        disabled={disabled}
        onPointerDown={(e) => e.preventDefault()}
        onClick={onSubmit}
        className="flex h-16 w-full items-center justify-center gap-2 rounded-md border border-line bg-accent text-2xl font-display text-accent-fg transition-[transform,background-color] duration-150 ease-out touch-manipulation active:not-disabled:scale-[0.96] disabled:opacity-40"
        aria-label="Confirmar"
      >
        <CornerDownLeft className="size-6" strokeWidth={2} />
        OK
      </button>
    </div>
  );
}
