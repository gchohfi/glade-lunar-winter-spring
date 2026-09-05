import { Delete, CornerDownLeft } from "lucide-react";
import { cn } from "@/lib/utils";

const KEYS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", ",", "0", "back"] as const;

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
        const isAction = key === "back";
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
              "flex h-14 sm:h-16 items-center justify-center rounded-md border text-2xl font-display transition-[transform,background-color] duration-150 ease-out touch-manipulation active:not-disabled:scale-[0.96] disabled:opacity-40",
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
      <button
        type="button"
        disabled={disabled}
        onPointerDown={(e) => e.preventDefault()}
        onClick={onSubmit}
        className="col-span-3 flex h-14 items-center justify-center gap-2 rounded-md border border-accent bg-accent font-display text-lg text-accent-fg touch-manipulation active:not-disabled:scale-[0.98] disabled:opacity-40"
        aria-label="Confirmar"
      >
        <CornerDownLeft className="size-5" strokeWidth={2} />
        Confirmar
      </button>
    </div>
  );
}
