import { useEffect, useRef } from "react";
import { roundInfo } from "../game/progression";
import { useI18n } from "../i18n/I18n";
import { PENALTY_PRESENTATION, type PenaltyEntry } from "./penaltyPresentation";

export function PenaltyIntro({
  entry,
  onDismiss,
}: {
  entry: PenaltyEntry;
  onDismiss: () => void;
}) {
  const { t } = useI18n();
  const dialog = useRef<HTMLDialogElement>(null);
  const presentation = PENALTY_PRESENTATION[entry.penalty];
  const { stage, roundInStage } = roundInfo(entry.round);
  useEffect(() => {
    dialog.current?.showModal();
    const timer = window.setTimeout(onDismiss, 2400);
    return () => window.clearTimeout(timer);
  }, [onDismiss]);
  return (
    <dialog
      ref={dialog}
      className="penalty-intro"
      aria-labelledby="penalty-intro-title"
      aria-describedby="penalty-intro-description"
      onCancel={(event) => {
        event.preventDefault();
        onDismiss();
      }}
    >
      <div className="penalty-intro-art" aria-hidden="true">
        <div className="penalty-halo" />
        <span className="penalty-orbit suit-one">♠</span>
        <span className="penalty-orbit suit-two">♦</span>
        <span className="penalty-orbit suit-three">♣</span>
        <span className="penalty-orbit suit-four">♥</span>
        <div className="penalty-emblem">
          <small>!</small>
          <strong>{presentation.symbol}</strong>
          <small>!</small>
        </div>
      </div>
      <p className="penalty-intro-round">
        {t("penaltyRound", { stage, round: roundInStage })}
      </p>
      <p className="penalty-intro-label">{t("penaltyLabel")}</p>
      <h2 id="penalty-intro-title">{t(presentation.name)}</h2>
      <p id="penalty-intro-description">{t(presentation.description)}</p>
      <button className="button penalty-intro-continue" onClick={onDismiss}>
        {t("penaltyContinue")}
      </button>
      <span className="penalty-intro-timer" aria-hidden="true" />
    </dialog>
  );
}
