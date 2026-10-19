import { describe, expect, it } from "vitest";
import { scoreHand } from "../../../src/game/score";
import type {
  Card,
  HandId,
  Joker,
  JokerId,
  Rank,
  Suit,
} from "../../../src/game/types";

const suits: Record<string, Suit> = {
  s: "spades",
  h: "hearts",
  d: "diamonds",
  c: "clubs",
};
function cards(text: string): Card[] {
  return text.split(" ").map((value, id) => ({
    id,
    rank: value.slice(0, -1) as Rank,
    suit: suits[value.slice(-1)],
  }));
}
const jokers = (...kinds: JokerId[]): Joker[] =>
  kinds.map((kind, id) => ({ kind, id }));

describe("standard hand scoring", () => {
  it.each<[string, string, HandId, number, number]>([
    ["TC-001", "As Kh 9d 7c 2s", "high", 16, 1],
    ["TC-002", "10s 10h Kc 7d 2c", "pair", 60, 2],
    ["TC-003", "10s 10h 4s 4h Kd", "twoPair", 96, 4],
    ["TC-004", "7s 7h 7d Kc 2s", "three", 153, 3],
    ["TC-005", "As 2h 3d 4c 5s", "straight", 220, 5],
    ["TC-006", "2h 5h 7h 9h Kh", "flush", 272, 5],
    ["TC-007", "8s 8h 8d 2s 2h", "fullHouse", 272, 5],
    ["TC-008", "9s 9h 9d 9c As", "four", 672, 4],
    ["TC-009", "5h 6h 7h 8h 9h", "straightFlush", 1080, 5],
    ["TC-010", "10s Js Qs Ks As", "straightFlush", 1208, 5],
  ])("%s: %s", (_id, input, hand, score, count) => {
    const result = scoreHand(cards(input));
    expect({
      hand: result.hand,
      score: result.score,
      count: result.scoringIds.length,
    }).toEqual({ hand, score, count });
    expect(result.steps.at(-1)).toMatchObject({
      chips: result.chips,
      mult: result.mult,
    });
  });
  it("TC-011 / TC-012: Joker order changes the final score", () => {
    const pair = cards("10s 10h");
    expect(
      scoreHand(pair, jokers("joker", "card_sharp"), {
        playedHandTypes: ["pair"],
      }).score,
    ).toBe(540);
    expect(
      scoreHand(pair, jokers("card_sharp", "joker"), {
        playedHandTypes: ["pair"],
      }).score,
    ).toBe(300);
  });
  it("TC-013: Card Sharp waits for a repeated hand and stacks per instance", () => {
    expect(scoreHand(cards("2s"), jokers("card_sharp")).score).toBe(7);
    expect(
      scoreHand(cards("2s"), jokers("card_sharp", "card_sharp"), {
        playedHandTypes: ["high"],
      }).score,
    ).toBe(63);
  });
  it("TC-014: Abstract Joker applies once and includes itself", () => {
    expect(
      scoreHand(cards("8s 8h 8d 2s 2h"), jokers("abstract_joker")).score,
    ).toBe(476);
  });
  it("TC-022: a wrapping ace sequence is not a straight", () => {
    expect(scoreHand(cards("Qs Kh Ad 2c 3s")).hand).toBe("high");
  });
  it("TC-023: four-card flush and straight do not qualify", () => {
    expect(scoreHand(cards("2h 3h 4h 5h")).hand).toBe("high");
  });
  it("TC-024: contextual chip Jokers stack using discards and draw pile counts", () => {
    expect(
      scoreHand(cards("2s"), jokers("banner", "banner", "blue_joker"), {
        remainingDiscards: 2,
        remainingDeckCount: 10,
      }).score,
    ).toBe(147);
  });
  it("TC-025: Abstract Joker also affects a flush", () => {
    expect(
      scoreHand(cards("2h 5h 7h 9h Kh"), jokers("abstract_joker")).score,
    ).toBe(476);
  });
  it("TC-026: invalid scoring input is rejected", () => {
    expect(() => scoreHand([])).toThrow();
    const input = cards("2s");
    expect(() => scoreHand([input[0], input[0]])).toThrow();
    expect(() => scoreHand(cards("2s 3s 4s 5s 6s 7s"))).toThrow();
  });
});

it("TC-079: identical Joker kinds retain distinct instance identities in the animation trace", () => {
  const result = scoreHand(
    [{ id: 1, rank: "A", suit: "spades" }],
    [
      { id: 91, kind: "joker" },
      { id: 92, kind: "joker" },
    ],
  );
  expect(
    result.steps
      .filter((step) => step.kind === "joker")
      .map((step) => step.instanceId),
  ).toEqual([91, 92]);
});
