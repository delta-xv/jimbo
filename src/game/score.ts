import { HANDS, RANKS, SUITS } from "./config";
import type {
  Card,
  HandId,
  Joker,
  JokerId,
  Rank,
  ScoreResult,
  ScoreStep,
  Suit,
} from "./types";
export function rankValue(rank: Rank): number {
  return RANKS.indexOf(rank) + 2;
}
export function rankChips(rank: Rank): number {
  return rank === "A" ? 11 : Math.min(rankValue(rank), 10);
}
export function suitMatches(a: Suit, b: Suit, smeared: boolean) {
  return (
    a === b ||
    (smeared &&
      ["hearts", "diamonds"].includes(a) === ["hearts", "diamonds"].includes(b))
  );
}
export function isFace(card: Card, jokers: readonly Joker[]) {
  return (
    ["J", "Q", "K"].includes(card.rank) ||
    jokers.some((j) => j.kind === "pareidolia")
  );
}
export function evaluateHand(
  cards: readonly Card[],
  jokers: readonly Joker[] = [],
): { hand: HandId; scoring: readonly Card[] } {
  const has = (kind: JokerId) => jokers.some((j) => j.kind === kind);
  const minimum = has("four_fingers") ? 4 : 5,
    gap = has("shortcut") ? 2 : 1,
    smeared = has("smeared_joker");
  const groups = new Map<Rank, Card[]>();
  for (const card of cards)
    groups.set(card.rank, [...(groups.get(card.rank) ?? []), card]);
  const counts = [...groups.values()]
    .map((g) => g.length)
    .sort((a, b) => b - a);
  const flushCards = SUITS.map((suit) =>
    cards.filter((c) => suitMatches(c.suit, suit, smeared)),
  ).find((group) => group.length >= minimum);
  const values = [...groups.keys()].map(rankValue).sort((a, b) => a - b);
  let straightValues: number[] = [];
  for (const sequence of [
    values,
    values.includes(14) ? [1, ...values.filter((v) => v !== 14)] : values,
  ]) {
    let run: number[] = [];
    for (const value of sequence) {
      if (run.length && value - run.at(-1)! > gap) run = [];
      run.push(value);
      if (run.length >= minimum && run.length >= straightValues.length)
        straightValues = [...run];
    }
  }
  const straight = straightValues.length >= minimum,
    flush = !!flushCards;
  const hand: HandId =
    flush && straight
      ? "straightFlush"
      : counts[0] === 4
        ? "four"
        : counts[0] === 3 && counts[1] === 2
          ? "fullHouse"
          : flush
            ? "flush"
            : straight
              ? "straight"
              : counts[0] === 3
                ? "three"
                : counts[0] === 2 && counts[1] === 2
                  ? "twoPair"
                  : counts[0] === 2
                    ? "pair"
                    : "high";
  const size =
    hand === "four"
      ? 4
      : hand === "three"
        ? 3
        : hand === "pair" || hand === "twoPair"
          ? 2
          : 0;
  let scoring: readonly Card[] = cards;
  if (hand === "high")
    scoring = [
      cards.reduce((best, c) =>
        rankValue(c.rank) > rankValue(best.rank) ? c : best,
      ),
    ];
  else if (size)
    scoring = cards.filter((c) => groups.get(c.rank)?.length === size);
  else if (hand === "flush") scoring = flushCards!;
  else if (hand === "straightFlush")
    scoring = cards.filter(
      (c) =>
        flushCards!.some((card) => card.id === c.id) ||
        straightValues.includes(rankValue(c.rank)) ||
        (c.rank === "A" && straightValues.includes(1)),
    );
  else if (hand === "straight")
    scoring = cards.filter(
      (c) =>
        straightValues.includes(rankValue(c.rank)) ||
        (c.rank === "A" && straightValues.includes(1)),
    );
  if (has("splash")) scoring = cards;
  return { hand, scoring };
}
const PASSIVE: readonly JokerId[] = [
  "blueprint",
  "four_fingers",
  "shortcut",
  "smeared_joker",
  "pareidolia",
  "merry_andy",
  "splash",
];
export function blueprintCompatible(kind: JokerId): boolean {
  return !PASSIVE.includes(kind);
}
function effectiveJokers(
  jokers: readonly Joker[],
  disabledJokerId?: number | null,
) {
  return jokers.flatMap((source, index) => {
    const target = source.kind === "blueprint" ? jokers[index + 1] : source;
    return source.id === disabledJokerId ||
      !target ||
      target.id === disabledJokerId ||
      (source.kind === "blueprint" && !blueprintCompatible(target.kind))
      ? []
      : [{ source, target }];
  });
}
export function scoreHand(
  cards: readonly Card[],
  jokers: readonly Joker[] = [],
  options: {
    disabledJokerId?: number | null;
    debuffedCardIds?: readonly number[];
    debuffFaces?: boolean;
    remainingDiscards?: number;
    remainingDeckCount?: number;
    playedHandTypes?: readonly HandId[];
    runHandCounts?: Partial<Record<HandId, number>>;
  } = {},
): ScoreResult {
  if (
    cards.length < 1 ||
    cards.length > 5 ||
    new Set(cards.map((c) => c.id)).size !== cards.length
  )
    throw new RangeError("Select 1–5 distinct cards");
  const enabledJokers = jokers.filter(
    (joker) => joker.id !== options.disabledJokerId,
  );
  const { hand, scoring } = evaluateHand(cards, enabledJokers);
  let { chips, mult } = HANDS[hand];
  const steps: ScoreStep[] = [{ kind: "hand", hand, chips, mult }],
    debuffedIds: number[] = [];
  const effective = effectiveJokers(jokers, options.disabledJokerId),
    photographed = new Set<number>(),
    smeared = enabledJokers.some((j) => j.kind === "smeared_joker");
  function emit(
    source: Joker,
    operation: "chips" | "mult" | "multiply" | "retrigger",
    amount: number,
  ) {
    if (!amount) return;
    if (operation === "chips") chips += amount;
    else if (operation === "mult") mult += amount;
    else if (operation === "multiply") mult *= amount;
    steps.push({
      kind: "joker",
      joker: source.kind,
      instanceId: source.id,
      operation,
      amount,
      chips,
      mult,
    });
  }
  const scored = scoring.filter((card) => {
    if (
      options.debuffedCardIds?.includes(card.id) ||
      (options.debuffFaces && isFace(card, enabledJokers))
    ) {
      debuffedIds.push(card.id);
      steps.push({
        kind: "debuff",
        rank: card.rank,
        suit: card.suit,
        chips,
        mult,
      });
      return false;
    }
    return true;
  });
  for (const card of scored) {
    const face = isFace(card, enabledJokers);
    const repeats = effective.filter(
      ({ target }) =>
        (target.kind === "sock_and_buskin" && face) ||
        (target.kind === "hack" && ["2", "3", "4", "5"].includes(card.rank)),
    );
    for (let pass = 0; pass <= repeats.length; pass++) {
      if (pass > 0) emit(repeats[pass - 1].source, "retrigger", 1);
      chips += rankChips(card.rank);
      steps.push({
        kind: "card",
        rank: card.rank,
        suit: card.suit,
        amount: rankChips(card.rank),
        chips,
        mult,
      });
      for (const { source, target } of effective) {
        const suits: Partial<Record<JokerId, Suit>> = {
          wrathful_joker: "spades",
          lusty_joker: "hearts",
          greedy_joker: "diamonds",
          gluttonous_joker: "clubs",
        };
        const suit = suits[target.kind];
        if (suit && suitMatches(card.suit, suit, smeared))
          emit(source, "mult", 4);
        else if (
          target.kind === "even_steven" &&
          ["2", "4", "6", "8", "10"].includes(card.rank)
        )
          emit(source, "mult", 4);
        else if (
          target.kind === "fibonacci" &&
          ["A", "2", "3", "5", "8"].includes(card.rank)
        )
          emit(source, "mult", 8);
        else if (target.kind === "scary_face" && face)
          emit(source, "chips", 30);
        else if (target.kind === "smiley_face" && face) emit(source, "mult", 5);
        else if (
          target.kind === "ancient_joker" &&
          suitMatches(card.suit, target.targetSuit ?? "spades", smeared)
        )
          emit(source, "multiply", 1.5);
        else if (
          target.kind === "photograph" &&
          face &&
          !photographed.has(source.id)
        ) {
          photographed.add(source.id);
          emit(source, "multiply", 2);
        }
      }
    }
  }
  const coversAllSuits = (index = 0, used: number[] = []): boolean =>
    index === 4 ||
    scored.some(
      (card) =>
        !used.includes(card.id) &&
        suitMatches(card.suit, SUITS[index], smeared) &&
        coversAllSuits(index + 1, [...used, card.id]),
    );
  for (const { source, target } of effective) {
    switch (target.kind) {
      case "banner":
        emit(source, "chips", 30 * (options.remainingDiscards ?? 0));
        break;
      case "joker":
        emit(source, "mult", 4);
        break;
      case "abstract_joker":
        emit(source, "mult", 3 * jokers.length);
        break;
      case "card_sharp":
        if (options.playedHandTypes?.includes(hand))
          emit(source, "multiply", 3);
        break;
      case "blue_joker":
        emit(source, "chips", 2 * (options.remainingDeckCount ?? 0));
        break;
      case "half_joker":
        if (cards.length < 3) emit(source, "mult", 20);
        break;
      case "green_joker":
      case "misprint":
        emit(source, "mult", target.value ?? 0);
        break;
      case "square_joker":
      case "castle":
        emit(source, "chips", target.value ?? 0);
        break;
      case "supernova":
        emit(source, "mult", 3 * ((options.runHandCounts?.[hand] ?? 0) + 1));
        break;
      case "the_order":
        if (hand === "straight" || hand === "straightFlush")
          emit(source, "multiply", 3);
        break;
      case "seeing_double":
        if (
          scored.some(
            (c) =>
              suitMatches(c.suit, "clubs", smeared) &&
              scored.some(
                (other) =>
                  other.id !== c.id &&
                  !suitMatches(other.suit, "clubs", smeared),
              ),
          )
        )
          emit(source, "multiply", 2);
        break;
      case "flower_pot":
        if (scored.length >= 4 && coversAllSuits()) {
          emit(source, "chips", 50);
          emit(source, "multiply", 3);
        }
        break;
    }
  }
  return {
    hand,
    scoringIds: scored.map((c) => c.id),
    debuffedIds,
    chips,
    mult,
    score: Math.floor(chips * mult),
    steps,
  };
}
