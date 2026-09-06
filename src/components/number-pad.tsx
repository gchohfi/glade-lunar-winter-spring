import { Delete, CornerDownLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

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
    <div className="number-pad" role="group" aria-label="Teclado de resposta">
      {KEYS.map((key) => {
        const isAction = key === "back";
        return (
          <Button
            key={key}
            type="button"
            disabled={disabled}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
              if (key === "back") onBack();
              else onDigit(key);
            }}
            variant="secondary"
            className="number-key"
            data-action={isAction}
            aria-label={key === "back" ? "Apagar" : key === "," ? "Vírgula" : key}
          >
            {key === "back" ? <Delete className="size-6" strokeWidth={2} /> : key}
          </Button>
        );
      })}
      <Button
        type="button"
        disabled={disabled}
        onPointerDown={(e) => e.preventDefault()}
        onClick={onSubmit}
        className="number-confirm"
        aria-label="Confirmar"
      >
        <CornerDownLeft className="size-5" strokeWidth={2} />
        Confirmar
      </Button>
    </div>
  );
}
