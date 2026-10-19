import { activePenalty, type PenaltyId } from "../game/progression";
import type { GameState } from "../game/types";
import type { MessageKey } from "../i18n/messages";
export const PENALTY_PRESENTATION: Record<
  PenaltyId,
  { name: MessageKey; description: MessageKey; symbol: string }
> = {
  face_debuff: {
    name: "penaltyFaceName",
    description: "penaltyFaceDesc",
    symbol: "K♠",
  },
  one_hand_type: {
    name: "penaltyTypeName",
    description: "penaltyTypeDesc",
    symbol: "≡",
  },
  forced_card: {
    name: "penaltyForcedName",
    description: "penaltyForcedDesc",
    symbol: "◆",
  },
  no_discards: {
    name: "penaltyDiscardName",
    description: "penaltyDiscardDesc",
    symbol: "×",
  },
  one_hand: {
    name: "penaltyHandName",
    description: "penaltyHandDesc",
    symbol: "1",
  },
  small_hand: {
    name: "penaltySmallName",
    description: "penaltySmallDesc",
    symbol: "−1",
  },
  no_repeat: {
    name: "penaltyRepeatName",
    description: "penaltyRepeatDesc",
    symbol: "↺",
  },
  joker_debuff: {
    name: "penaltyJokerName",
    description: "penaltyJokerDesc",
    symbol: "?",
  },
  large_target: {
    name: "penaltyLargeName",
    description: "penaltyLargeDesc",
    symbol: "×1.5",
  },
  played_cards_debuff: {
    name: "penaltyPlayedName",
    description: "penaltyPlayedDesc",
    symbol: "∅",
  },
};
export interface PenaltyEntry {
  round: number;
  penalty: PenaltyId;
}
export function enteringPenalty(
  before: GameState,
  after: GameState,
): PenaltyEntry | null {
  const penalty = activePenalty(after);
  return after.phase === "playing" &&
    penalty &&
    (before.phase !== "playing" || before.round !== after.round)
    ? { round: after.round, penalty }
    : null;
}
