import { nextRandom } from "./deck";
export const STAGES = 3;
export const ROUNDS_PER_STAGE = 3;
export const TOTAL_ROUNDS = 9;
export const PENALTY_IDS = [
  "face_debuff",
  "one_hand_type",
  "forced_card",
  "no_discards",
  "one_hand",
  "small_hand",
  "no_repeat",
  "joker_debuff",
  "large_target",
  "played_cards_debuff",
] as const;
export type PenaltyId = (typeof PENALTY_IDS)[number];
export function roundInfo(round: number) {
  return {
    stage: Math.floor((round - 1) / 3) + 1,
    roundInStage: ((round - 1) % 3) + 1,
    isPenalty: round % 3 === 0,
  };
}
export function activePenalty(state: {
  round: number;
  penalties: readonly PenaltyId[];
}): PenaltyId | null {
  return roundInfo(state.round).isPenalty
    ? state.penalties[roundInfo(state.round).stage - 1]
    : null;
}

export function drawPenalties(seed: number): PenaltyId[] {
  const result: PenaltyId[] = [];
  const pool: PenaltyId[] = [...PENALTY_IDS];
  for (let stage = 0; stage < STAGES; stage++) {
    const roll = nextRandom(seed);
    seed = roll.state;
    result.push(pool.splice(Math.floor(roll.value * pool.length), 1)[0]);
  }
  return result;
}
