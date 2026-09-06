import { Mascot } from "@/components/mascot";
import { FootballBall } from "@/components/football-ball";
import { useCosmetics } from "@/components/use-cosmetics";
import { cosmeticItem } from "@/lib/game/wardrobe";
import type { CosmeticSelection } from "@/lib/game/types";
import type { PlayFeedback } from "@/lib/game/football";

/** The wardrobe previews the actual playing field, without advancing a game. */
export function FieldScene({
  appearance,
  ballStep = 0,
  feedback = "none",
  goal = false,
}: {
  appearance?: CosmeticSelection;
  ballStep?: number;
  feedback?: PlayFeedback;
  goal?: boolean;
}) {
  const equipped = useCosmetics();
  const selection = appearance ?? equipped;
  const candidate = cosmeticItem(selection.fieldId);
  const field = candidate?.kind === "field" ? candidate : cosmeticItem("field-club")!;
  const position = Math.max(0, Math.min(3, ballStep));
  return (
    <div className="football-pitch" data-goal={goal}>
      <img
        className="pitch-environment"
        src={field.art}
        data-field-id={field.id}
        alt=""
        draggable={false}
      />
      <div className="pitch-nico-shadow" aria-hidden="true" />
      <Mascot
        mood={feedback === "bad" ? "try" : feedback === "ok" ? "win" : "guide"}
        className="pitch-nico"
      />
      <div
        className="pitch-ball-position"
        data-ball-position
        style={{
          left: [28, 48, 64, 78][position] + "%",
          top: [84, 78, 73, 65][position] + "%",
          scale: [1, 0.94, 0.86, 0.72][position],
        }}
        aria-hidden="true"
      >
        <FootballBall itemId={selection.ballId} />
      </div>
      {goal ? (
        <span className="pitch-goal-word" aria-hidden="true">
          GOOOL!
        </span>
      ) : null}
    </div>
  );
}
