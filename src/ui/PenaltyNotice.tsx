import { activePenalty, roundInfo } from "../game/progression";
import type { GameState } from "../game/types";
import { PENALTY_PRESENTATION } from "./penaltyPresentation";
import { useI18n } from "../i18n/I18n";
export function PenaltyNotice({
  state,
  inline = false,
}: {
  state: GameState;
  inline?: boolean;
}) {
  const { t, handName } = useI18n();
  if (
    state.phase === "ready" ||
    state.phase === "won" ||
    state.phase === "lost"
  )
    return null;
  const progress = roundInfo(
    state.phase === "shop" ? Math.min(state.round + 1, 9) : state.round,
  );
  const active = state.phase === "shop" ? null : activePenalty(state),
    penalty = state.penalties[progress.stage - 1];
  const { name, description } = PENALTY_PRESENTATION[penalty];
  return (
    <div
      className={`penalty-notice ${active ? "active" : ""} ${inline ? "inline" : ""}`}
      role="note"
    >
      <strong>
        <span className="pixel">{t("penaltyLabel")}</span>{" "}
        {t(active ? "penaltyActive" : "penaltyUpcoming", {
          stage: progress.stage,
        })}{" "}
        · {t(name)}
      </strong>
      <p>
        {active === "one_hand_type" && state.playedHandTypes[0]
          ? t("handTypeRequired", { hand: handName(state.playedHandTypes[0]) })
          : t(description)}
      </p>
    </div>
  );
}
