import { useState } from "react";
import { HANDS } from "../game/config";
import type { GameState, HandId } from "../game/types";
import { useI18n } from "../i18n/I18n";
import { Modal } from "./Modal";

const handIds = (Object.keys(HANDS) as HandId[]).reverse();

export function HandInfo({ state, onClose }: {
  state: GameState;
  onClose: () => void;
}) {
  const { t, handName, number } = useI18n();
  const [history, setHistory] = useState(state.phase !== "ready");
  return (
    <Modal title={t("rules")} onClose={onClose} className="hand-info">
      <div className="hand-info-switch" role="group" aria-label={t("rules")}>
        <button aria-pressed={!history} onClick={() => setHistory(false)}>{t("handScores")}</button>
        <button aria-pressed={history} onClick={() => setHistory(true)}>{t("handHistory")}</button>
      </div>
      {history ? (
        <>
          <ul className="hand-history" aria-label={t("handHistory")}>
            {handIds.map((id) => (
              <li key={id} data-hand-type={id} className={state.runHandCounts[id] ? "has-plays" : ""}>
                <h3>{handName(id)}</h3>
                <dl>
                  <div><dt>{t("historyRun")}</dt><dd className="pixel" data-count="run">{number(state.runHandCounts[id] ?? 0)}</dd></div>
                  <div><dt>{t("historyRound")}</dt><dd className="pixel" data-count="round">{state.roundHandCounts ? number(state.roundHandCounts[id] ?? 0) : "—"}</dd></div>
                </dl>
              </li>
            ))}
          </ul>
          <p className="hand-history-hint">{t(state.roundHandCounts ? "historyHint" : "historyLegacy")}</p>
        </>
      ) : (
        <>
          <p className="modal-intro">{t("rulesIntro")}</p>
          <table className="rules-table">
            <thead><tr><th>{t("handType")}</th><th className="blue">{t("baseChips")}</th><th className="coral">{t("baseMult")}</th></tr></thead>
            <tbody>{handIds.map((id) => (
              <tr key={id}><td>{handName(id)}</td><td className="pixel blue">{HANDS[id].chips}</td><td className="pixel coral">{HANDS[id].mult}</td></tr>
            ))}</tbody>
          </table>
          <p className="modal-intro">{t("rulesBody")}</p>
        </>
      )}
    </Modal>
  );
}
