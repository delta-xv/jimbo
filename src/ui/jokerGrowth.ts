import { disabledJoker } from "../game/jokerActivity";
import type { Action, GameState } from "../game/types";

export interface JokerGrowth {
  readonly id: number;
  readonly direction: "gain" | "loss";
}
export function jokerGrowth(
  before: GameState,
  after: GameState,
  action: Action,
): readonly JokerGrowth[] {
  if (
    before === after ||
    before.phase !== "playing" ||
    before.locked ||
    (action.type !== "play" && action.type !== "discard")
  )
    return [];
  const disabled = disabledJoker(before);
  const changes: JokerGrowth[] = [];
  for (const joker of before.jokers) {
    if (joker.id === disabled) continue;
    const next = after.jokers.find(
      (item) => item.id === joker.id && item.kind === joker.kind,
    );
    if (!next) continue;
    let delta = 0;
    if (["castle", "green_joker", "square_joker"].includes(joker.kind))
      delta = (next.value ?? 0) - (joker.value ?? 0);
    else if (
      joker.kind === "supernova" &&
      action.type === "play" &&
      after.lastScore
    ) {
      const hand = after.lastScore.hand;
      delta =
        (after.runHandCounts[hand] ?? 0) - (before.runHandCounts[hand] ?? 0);
    }
    if (delta !== 0)
      changes.push({ id: joker.id, direction: delta > 0 ? "gain" : "loss" });
  }
  return changes;
}

export const GROWTH_FRAMES: Record<JokerGrowth["direction"], Keyframe[]> = {
  gain: [
    {
      offset: 0,
      transform: "none",
      filter: "brightness(1)",
      boxShadow: "none",
    },
    {
      offset: 0.24,
      transform: "translateY(-4px) scale(1.07)",
      filter: "brightness(1.3) saturate(1.15)",
      boxShadow: "0 0 0 2px #a5f4c5, 0 0 15px 4px #66d79aaa",
    },
    {
      offset: 0.55,
      transform: "translateY(-1px) scale(1.025)",
      filter: "brightness(1.12)",
      boxShadow: "0 0 0 1px #8ae6b2, 0 0 9px 2px #66d79a55",
    },
    {
      offset: 1,
      transform: "none",
      filter: "brightness(1)",
      boxShadow: "none",
    },
  ],
  loss: [
    {
      offset: 0,
      transform: "none",
      filter: "brightness(1)",
      boxShadow: "none",
    },
    {
      offset: 0.2,
      transform: "translateX(-2px) scale(.96)",
      filter: "brightness(.72) saturate(.75)",
      boxShadow: "0 0 0 2px #f29a82, 0 0 12px 3px #da624b99",
    },
    {
      offset: 0.4,
      transform: "translateX(2px) scale(.97)",
      filter: "brightness(.8)",
      boxShadow: "0 0 0 2px #e98473, 0 0 8px 2px #da624b66",
    },
    {
      offset: 0.6,
      transform: "translateX(-1px) scale(.985)",
      filter: "brightness(.9)",
      boxShadow: "0 0 0 1px #e9847366",
    },
    {
      offset: 1,
      transform: "none",
      filter: "brightness(1)",
      boxShadow: "none",
    },
  ],
};
