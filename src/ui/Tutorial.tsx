import { useEffect, useReducer, useRef, useState } from "react";
import { useI18n } from "../i18n/I18n";
import {
  createPractice,
  hasPracticePair,
  practiceReducer,
} from "../tutorial/practice";
import { CardFace, cardColor } from "./CardFace";
import { JokerArt } from "./Jokers";
import { Modal } from "./Modal";

export function Tutorial({
  onClose,
  onFinish,
  hasSavedRun,
  animated,
}: {
  onClose: () => void;
  onFinish: () => void;
  hasSavedRun: boolean;
  animated: boolean;
}) {
  const { t, cardName } = useI18n();
  const [step, setStep] = useState(0);
  const [practice, act] = useReducer(
    practiceReducer,
    undefined,
    createPractice,
  );
  const heading = useRef<HTMLHeadingElement>(null);
  const titles = [
    "tutorialGoalTitle",
    "tutorialPlayTitle",
    "tutorialShopTitle",
  ] as const;
  useEffect(() => {
    heading.current?.focus({ preventScroll: true });
  }, [step]);
  return (
    <Modal
      title={t("tutorialTitle")}
      className={`tutorial-dialog ${animated ? "tutorial-motion" : ""}`}
      onClose={onClose}
    >
      <div className="tutorial-content" data-tutorial-step={step + 1}>
        <div className="tutorial-step-heading">
          <ol className="tutorial-progress" aria-label={t("tutorialProgress")}>
            {titles.map((title, i) => (
              <li
                key={title}
                aria-current={step === i ? "step" : undefined}
                className={i <= step ? "active" : ""}
              >
                <span>{i + 1}</span>
                <span className="sr-only">{t(title)}</span>
              </li>
            ))}
          </ol>
          <span className="tutorial-count">{step + 1} / 3</span>
        </div>
        <section
          key={step}
          className="tutorial-page"
          aria-labelledby="tutorial-heading"
        >
          <h3 id="tutorial-heading" ref={heading} tabIndex={-1}>
            {t(titles[step])}
          </h3>
          {step === 0 ? (
            <>
              <p className="tutorial-copy">{t("tutorialGoalBody")}</p>
              <div className="tutorial-illustration tutorial-goal">
                <span className="tutorial-example-label">
                  {t("tutorialExample")}
                </span>
                <div className="tutorial-score-grid">
                  <div className="tutorial-target">
                    <span>{t("tutorialTarget")}</span>
                    <strong className="pixel">300</strong>
                  </div>
                  <div className="tutorial-score">
                    <span>{t("tutorialCurrent")}</span>
                    <strong className="pixel">180</strong>
                  </div>
                </div>
                <div className="tutorial-progress-track" aria-hidden="true">
                  <span />
                </div>
                <div className="tutorial-hands">
                  <span>{t("tutorialRemaining")}</span>
                  <strong className="pixel">2</strong>
                </div>
                <p className="tutorial-example-note">
                  {t("tutorialGoalExample")}
                </p>
              </div>
              <p className="tutorial-note">{t("tutorialNineRounds")}</p>
            </>
          ) : step === 1 ? (
            <>
              <p className="tutorial-copy">
                {t(practice.played ? "tutorialPlayedBody" : "tutorialPickBody")}
              </p>
              <div
                className="tutorial-illustration tutorial-practice"
                data-practice-state={practice.played ? "done" : "select"}
              >
                <div className="tutorial-practice-stats">
                  <span>
                    {t("tutorialCurrent")}{" "}
                    <b className="pixel" data-tutorial-score>
                      {practice.score}
                    </b>
                  </span>
                  <span>
                    {t("tutorialRemaining")}{" "}
                    <b className="pixel" data-tutorial-hands>
                      {practice.hands}
                    </b>
                  </span>
                </div>
                <div
                  className="tutorial-hand"
                  role="group"
                  aria-label={t("tutorialPracticeHand")}
                >
                  {practice.cards.map((card) => (
                    <button
                      key={card.id}
                      type="button"
                      data-tutorial-card={card.id}
                      className={`playing-card ${cardColor(card)} ${practice.selected.includes(card.id) ? "selected" : ""}`}
                      disabled={practice.played}
                      aria-label={cardName(card)}
                      aria-pressed={practice.selected.includes(card.id)}
                      onClick={() => act({ type: "toggle", id: card.id })}
                    >
                      <CardFace card={card} />
                    </button>
                  ))}
                </div>
                <div className="tutorial-practice-actions">
                  <p role="status">
                    {t(
                      practice.played
                        ? "tutorialPairScored"
                        : hasPracticePair(practice)
                          ? "tutorialPairReady"
                          : "tutorialFindPair",
                    )}
                  </p>
                  {practice.played ? (
                    <button
                      className="tutorial-retry"
                      onClick={() => act({ type: "reset" })}
                    >
                      {t("tutorialRetry")}
                    </button>
                  ) : (
                    <button
                      className="button blue tutorial-play"
                      disabled={!hasPracticePair(practice)}
                      onClick={() => act({ type: "play" })}
                    >
                      {t("play")}
                    </button>
                  )}
                </div>
              </div>
              <p className="tutorial-note">{t("tutorialDiscardBody")}</p>
            </>
          ) : (
            <>
              <p className="tutorial-copy">{t("tutorialShopBody")}</p>
              <div className="tutorial-illustration tutorial-shop">
                <ol className="tutorial-shop-flow">
                  <li>{t("tutorialReward")}</li>
                  <li>{t("tutorialShopVisit")}</li>
                  <li>{t("nextRound")}</li>
                </ol>
                <div className="tutorial-joker">
                  <JokerArt kind="joker" />
                  <div>
                    <strong>{t("tutorialAuto")}</strong>
                    <p>{t("tutorialJokerBody")}</p>
                  </div>
                </div>
              </div>
              <p className="tutorial-note tutorial-penalty">
                <b>!</b>
                <span>{t("tutorialPenaltyBody")}</span>
              </p>
            </>
          )}
        </section>
        <footer className="tutorial-footer">
          <p>{t("tutorialSafe")}</p>
          <div className="tutorial-nav">
            <button
              className="button neutral tutorial-back"
              disabled={step === 0}
              onClick={() => setStep(step - 1)}
            >
              {t("tutorialPrevious")}
            </button>
            <button className="tutorial-skip" onClick={onClose}>
              {t("tutorialSkip")}
            </button>
            {step < 2 ? (
              <button
                className="button gold-button tutorial-next"
                onClick={() => setStep(step + 1)}
              >
                {t("tutorialNext")} →
              </button>
            ) : (
              <button
                className="button green tutorial-finish"
                onClick={onFinish}
              >
                {t(hasSavedRun ? "tutorialContinue" : "start")} →
              </button>
            )}
          </div>
        </footer>
      </div>
    </Modal>
  );
}
