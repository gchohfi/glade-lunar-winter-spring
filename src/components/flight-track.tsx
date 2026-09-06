import { Mascot } from "@/components/mascot";
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
  return (
    <div className="football-play" data-football-play>
      <div className="mt-3 flex items-center justify-between gap-2 text-sm">
        <p className="font-display text-lg" data-score>
          {practicing
            ? `Jogadas ${correct}/${practiceTotal}`
            : `Gols ${play.goals}/${GOALS_PER_MATCH}`}
        </p>
        <p className="text-muted">
          {practicing ? "Treino assistido" : goal ? "Gol!" : play.nextPlay}
        </p>
        {combo >= 3 ? <span className="text-accent">{combo} seguidos</span> : null}
      </div>
      <div className="football-pitch" data-goal={goal}>
        <div className="pitch-boundary" aria-hidden="true" />
        <div className="pitch-center" aria-hidden="true" />
        <div className="pitch-area" aria-hidden="true" />
        <div className="pitch-goal" aria-hidden="true" />
        <Mascot
          mood={feedback === "bad" ? "try" : feedback === "ok" ? "win" : "guide"}
          className="pitch-nico"
        />
        <span
          className="football-ball pitch-ball"
          style={{ left: play.ballPercent + "%" }}
          aria-hidden="true"
        >
          ⚽
        </span>
        {goal ? (
          <span className="pitch-goal-word" aria-hidden="true">
            GOOOL!
          </span>
        ) : null}
      </div>
      <p
        className="nico-pitch-speech text-sm text-muted"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="font-medium text-accent">Nico: </span>
        {practicing
          ? feedback === "bad"
            ? "Vamos resolver juntos. Eu mostro um caminho."
            : feedback === "ok"
              ? "Boa! Cada jogada é uma chance de aprender."
              : "Sem pressa. Se precisar, toque em Me ensina, Nico."
          : play.line}
      </p>
    </div>
  );
}
