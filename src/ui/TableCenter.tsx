import { HANDS } from "../game/config";
import type { CSSProperties } from "react";
import type { MotionStage } from "./motion";
import { AnimatedNumber } from "./AnimatedNumber";
import { targetScore } from "../game/penalty";
import { useI18n } from "../i18n/I18n";
import type { Action, GameState, HandPreview, ScoreStep } from "../game/types";
import { CardFace, cardColor } from "./CardFace";

export function TableCenter({
  state,
  preview,
  step,
  dispatch,
  onSettings,
  onTutorial,
  tutorialNew = false,
  onStart,
  onContinue,
  savedRound,
  motionStage,
  pulseKey = "",
  motionEnabled = false,
}: {
  state: GameState;
  preview: HandPreview | null;
  step: ScoreStep | null;
  dispatch: (action: Action) => void;
  onSettings?: () => void;
  onTutorial?: () => void;
  tutorialNew?: boolean;
  onStart?: () => void;
  onContinue?: () => void;
  savedRound?: number;
  motionStage?: MotionStage;
  pulseKey?: string;
  motionEnabled?: boolean;
}) {
  const { t, handName, formatStep } = useI18n();
  if (state.phase === "ready")
    return (
      <section className="welcome center-panel">
        <div className="table-emblem">♠</div>
        <h2>{t("gameName")}</h2>
        <p>{t("welcomeBody")}</p>
        <div className="welcome-actions">
          {onContinue && (
            <button className="button green" onClick={onContinue}>
              {t("continueRun", { round: savedRound ?? 1 })}
            </button>
          )}
          <button
            className="button blue"
            onClick={onStart ?? (() => dispatch({ type: "start" }))}
          >
            {t(onContinue ? "newRun" : "start")} <span>→</span>
          </button>
        </div>
        <div className="welcome-tools">
          <button
            className={`tutorial-entry ${tutorialNew ? "is-new" : ""}`}
            onClick={onTutorial}
          >
            <span>{t("tutorialTitle")}</span>
            <small>{t("tutorialTime")}</small>
          </button>
          <button className="welcome-settings" onClick={onSettings}>
            {t("settings")}
          </button>
        </div>
        <small>
          {t("roundResources", {
            hands: state.rules.hands,
            discards: state.rules.discards,
          })}
        </small>
      </section>
    );
  if (!state.locked && state.phase === "roundWon") {
    return (
      <section className="result-panel center-panel" aria-live="polite">
        {
          <div className="result-sparks" aria-hidden="true">
            {Array.from({ length: 12 }, (_, i) => (
              <i
                key={i}
                style={
                  {
                    "--spark-angle": `${i * 30}deg`,
                    "--spark-delay": `${(i % 3) * 65}ms`,
                  } as CSSProperties
                }
              />
            ))}
          </div>
        }
        <span className="result-symbol">✦</span>
        <h2>{t("cleared")}</h2>
        <div className="result-score pixel">
          <AnimatedNumber
            value={state.score}
            from={0}
            duration={650}
            enabled={motionEnabled}
          />{" "}
          <small>{t("points")}</small>
        </div>
        {state.reward ? (
          <div className="reward-breakdown">
            <span>
              {t("roundReward")} <b>+${state.reward.base}</b>
            </span>
            <span>
              {t("remainingHands")} <b>+${state.reward.hands}</b>
            </span>
            <span>
              {t("interest")} <b>+${state.reward.interest}</b>
            </span>
            <strong>
              {t("received")}{" "}
              <span className="gold">${state.reward.total}</span>
            </strong>
          </div>
        ) : null}
        <button
          className="button gold-button"
          onClick={() => dispatch({ type: "enterShop" })}
        >
          {t("visitShop")} →
        </button>
      </section>
    );
  }
  const result = state.locked ? state.lastScore : preview;
  return (
    <section
      className={`table-center ${state.locked ? "is-scoring" : ""}`}
      aria-live="polite"
    >
      <div className="table-emblem">♠</div>
      {state.locked ? (
        <>
          <div
            key={motionStage === "depart" ? "waiting" : "played"}
            className={`played-cards ${motionStage === "depart" ? "awaiting-play" : ""} ${motionStage === "deal" ? "played-clear" : ""}`}
          >
            {state.lastPlayed.map((card) => (
              <div
                key={
                  step &&
                  (step.kind === "card" || step.kind === "debuff") &&
                  step.rank === card.rank &&
                  step.suit === card.suit
                    ? `${card.id}-${pulseKey}`
                    : card.id
                }
                className={`playing-card miniature ${cardColor(card)} ${state.lastScore?.scoringIds.includes(card.id) ? "" : "kicker"} ${motionStage === "score" && step && (step.kind === "card" || step.kind === "debuff") && step.rank === card.rank && step.suit === card.suit ? (step.kind === "debuff" ? "card-fizzle" : "card-score-hit") : ""}`}
              >
                <CardFace card={card} />
                {motionStage === "score" &&
                  step?.kind === "card" &&
                  step.rank === card.rank &&
                  step.suit === card.suit && (
                    <span className="card-score-float pixel">
                      +{step.amount}
                    </span>
                  )}
              </div>
            ))}
          </div>
          <h2 className="scoring-hand-name">
            {state.lastScore ? handName(state.lastScore.hand) : t("scoring")}
          </h2>
          <p
            key={pulseKey}
            className={`scoring-detail ${step ? "step-float" : ""}`}
          >
            {step
              ? `${formatStep(step).source} · ${formatStep(step).detail}`
              : t("scoring")}
          </p>
          <strong
            className={`expected-score pixel ${state.lastScore && state.lastScore.score >= targetScore(state) && (motionStage === "total" || motionStage === "deal") ? "total-on-fire" : ""} ${motionStage === "total" ? "score-impact" : ""}`}
          >
            +
            <AnimatedNumber
              value={
                motionStage === "total" || motionStage === "deal"
                  ? (state.lastScore?.score ?? 0)
                  : step
                    ? Math.floor(step.chips * step.mult)
                    : 0
              }
              duration={180}
              enabled={motionEnabled}
            />
          </strong>
        </>
      ) : result ? (
        <>
          <h2 className="current-hand-type">{handName(result.hand)}</h2>
          <p className="preview-equation">
            <span className="blue pixel">{HANDS[result.hand].chips}</span> ×{" "}
            <span className="coral pixel">{HANDS[result.hand].mult}</span>
          </p>
          <p className="base-score-hint">{t("baseScoreHint")}</p>
        </>
      ) : (
        <>
          <h2 className="choose-prompt">{t("choose")}</h2>
        </>
      )}
    </section>
  );
}
