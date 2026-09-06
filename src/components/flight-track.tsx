import { FieldScene } from "@/components/field-scene";
import { Check, Flag } from "lucide-react";
import { footballState, GOALS_PER_MATCH, type PlayFeedback } from "@/lib/game/football";

export function FootballPitch({
  correct,
  combo,
  feedback,
  practiceTotal,
}: {
  correct: number;
  combo: number;
  feedback: PlayFeedback;
  practiceTotal?: number;
}) {
  const play = footballState(correct, feedback);
  const practicing = practiceTotal !== undefined;
  const goal = !practicing && play.goalJustScored;
  const step = goal ? 3 : correct % 3;
  // Screen coordinates follow the perspective in pitch-v2, not scoring logic.
  const ballStep = goal ? 3 : correct % 3;
  return (
    <div className="football-play" data-football-play data-feedback={feedback}>
      <div className="pitch-scoreboard">
        <div>
          <p className="match-eyebrow">
            {practicing ? "Centro de treinamento" : "Nosso time em campo"}
          </p>
          <p className="pitch-current-play">
            {practicing ? "Uma jogada de cada vez" : goal ? "Gol do nosso time!" : play.nextPlay}
          </p>
        </div>
        <p className="pitch-score" data-score>
          <Flag className="size-4" aria-hidden="true" />
          {practicing
            ? `Jogadas ${correct}/${practiceTotal}`
            : `Gols ${play.goals}/${GOALS_PER_MATCH}`}
        </p>
      </div>
      <FieldScene ballStep={ballStep} feedback={feedback} goal={goal} />
      {!practicing ? (
        <ol className="pitch-sequence" aria-label="Dois passes e um chute fazem um gol">
          {["Primeiro passe", "Segundo passe", "Chute a gol"].map((label, i) => (
            <li
              key={label}
              data-state={i < step ? "done" : i === step ? "current" : "next"}
              aria-current={i === step ? "step" : undefined}
            >
              <span className="pitch-step-number" aria-hidden="true">
                {i < step ? <Check className="size-3" /> : i + 1}
              </span>
              <span>{label}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <p className="nico-pitch-speech" role="status" aria-live="polite" aria-atomic="true">
        <span className="nico-speech-name">Nico</span>
        <span>
          {practicing
            ? feedback === "bad"
              ? "Vamos resolver juntos. Eu mostro um caminho."
              : feedback === "ok"
                ? "Boa! Cada jogada é uma chance de aprender."
                : "Sem pressa. Se precisar, toque em Me ensina, Nico."
            : play.line}
        </span>
        {combo >= 3 ? <span className="pitch-combo">{combo} seguidos</span> : null}
      </p>
    </div>
  );
}
