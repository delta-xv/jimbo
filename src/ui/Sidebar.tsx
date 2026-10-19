import { HANDS } from "../game/config";
import { AnimatedNumber } from "./AnimatedNumber";
import { roundInfo } from "../game/progression";
import { targetScore } from "../game/penalty";
import { useI18n } from "../i18n/I18n";
import type { GameState, HandPreview, ScoreStep } from "../game/types";

export function Sidebar({
  state,
  preview,
  step,
  motionEnabled = false,
  pulseKey = "idle",
  scoreValue = state.score,
  moneyValue = state.money,
  onRules,
  onRestart,
  onTrace,
}: {
  state: GameState;
  preview: HandPreview | null;
  step: ScoreStep | null;
  motionEnabled?: boolean;
  pulseKey?: string;
  scoreValue?: number;
  moneyValue?: number;
  onRules: () => void;
  onRestart: () => void;
  onTrace: () => void;
}) {
  const { t, number } = useI18n();
  const progress = roundInfo(state.round);
  const target = targetScore(state);
  const shown = step ?? (preview ? HANDS[preview.hand] : null);
  return (
    <aside className="sidebar">
      <div className="brand">
        <h1>
          JIMBO<span>♦</span>
        </h1>
      </div>
      <div className="run-panel">
        <div className="round-label progression-label">
          <div>
            <span>{t("setLabel")}</span>
            <strong className="pixel">{progress.stage}</strong>
            <span className="pixel">/3</span>
          </div>
          <div>
            <span>{t("roundLabel")}</span>
            <strong className="pixel">{progress.roundInStage}</strong>
            <span className="pixel">/3</span>
          </div>
        </div>
        <div className="target-panel">
          <span>{t("target")}</span>
          <strong className="pixel" data-testid="target">
            {target}
          </strong>
        </div>
        <div className="score-panel">
          <span>{t("roundScore")}</span>
          <strong className="pixel" data-testid="round-score">
            <AnimatedNumber value={scoreValue} enabled={motionEnabled} />
          </strong>
          <div className="progress-track">
            <i
              style={{
                width: `${Math.min(100, (scoreValue / target) * 100)}%`,
              }}
            />
          </div>
        </div>
        <div
          className={`score-formula ${step && step.chips * step.mult >= target ? "score-on-fire" : ""}`}
        >
          <div className="chip-box">
            <span>{t("chips")}</span>
            <strong
              key={`chips-${pulseKey}`}
              className={`pixel ${step ? "score-pop" : ""}`}
            >
              {shown?.chips ?? 0}
            </strong>
          </div>
          <b className="times">×</b>
          <div className="mult-box">
            <span>{t("mult")}</span>
            <strong
              key={`mult-${pulseKey}`}
              className={`pixel ${step ? "score-pop" : ""}`}
            >
              {number(shown?.mult ?? 0)}
            </strong>
          </div>
        </div>
        <div className="resources">
          <div>
            <span>{t("hands")}</span>
            <strong className="pixel blue" data-testid="hands">
              {state.hands}
            </strong>
          </div>
          <div>
            <span>{t("discards")}</span>
            <strong className="pixel coral" data-testid="discards">
              {state.discards}
            </strong>
          </div>
          <div className="wallet">
            <span>{t("money")}</span>
            <strong className="pixel gold" data-testid="money">
              $<AnimatedNumber value={moneyValue} enabled={motionEnabled} />
            </strong>
          </div>
        </div>
      </div>
      <nav className="side-actions">
        <button onClick={onRules} aria-label={t("rules")} title={t("rules")}>
          ♠ <span>{t("rules")}</span>
        </button>
        <button
          onClick={onTrace}
          disabled={!state.lastScore}
          aria-label={t("trace")}
          title={t("trace")}
        >
          ≡ <span>{t("trace")}</span>
        </button>
        <button
          onClick={onRestart}
          disabled={state.locked || state.phase === "ready"}
          aria-label={t("menu")}
          title={t("menu")}
        >
          ↻ <span>{t("menu")}</span>
        </button>
      </nav>
    </aside>
  );
}
