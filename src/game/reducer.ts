import { refreshDisabled } from "./jokerActivity";
import { sampleJokers, samplePack } from "./shop";
import {
  preparePlay,
  afterDiscard,
  roundJokers,
  prepareJokerTargets,
} from "./jokerState";
import { DEFAULT_RULES, copyRules, validRules, type RunRules } from "./rules";
import { CONFIG, JOKERS, PACKS } from "./config";
import { createDeck, shuffle, sortByRank } from "./deck";
import { drawPenalties, activePenalty } from "./progression";
import {
  handLimit,
  scorePlay,
  playProblem,
  refreshForced,
  targetScore,
} from "./penalty";
import type { Action, Card, GameState, JokerId, Offer } from "./types";

export function createGame(
  seed: number,
  input: RunRules = DEFAULT_RULES,
): GameState {
  const rules = copyRules(validRules(input) ? input : DEFAULT_RULES);
  return {
    seed: seed >>> 0,
    rules,
    penalties: drawPenalties((seed ^ 0xf00dbabe) >>> 0),
    penaltyRng: (seed ^ 0x9e3779b9) >>> 0,
    forcedCardId: null,
    disabledJokerId: null,
    playedHandTypes: [],
    runHandCounts: {},
    roundHandCounts: {},
    stagePlayedCards: [],
    effectRng: (seed ^ 0x082efa98) >>> 0,
    phase: "ready",
    round: 1,
    score: 0,
    hands: rules.hands,
    discards: rules.discards,
    money: rules.money,
    hand: [],
    deck: [],
    used: [],
    jokers: [],
    offers: [],
    pack: null,
    rerollCost: CONFIG.reroll,
    deckRng: (seed ^ 0x243f6a88) >>> 0,
    shopRng: (seed ^ 0x85a308d3) >>> 0,
    packRng: (seed ^ 0xa4093822) >>> 0,
    nextId: 1000,
    lastScore: null,
    lastPlayed: [],
    reward: null,
    locked: false,
  };
}

function startRound(state: GameState, round: number): GameState {
  const context = refreshDisabled({
    ...state,
    ...roundJokers(state, round),
    round,
    phase: "playing",
  });
  const penalty = activePenalty(context),
    limit = handLimit(context);
  const shuffled = shuffle(createDeck((round - 1) * 52 + 1), state.deckRng);
  return refreshForced({
    ...context,
    stagePlayedCards:
      Math.ceil(round / 3) === Math.ceil(state.round / 3)
        ? state.stagePlayedCards
        : [],
    phase: "playing",
    round,
    score: 0,
    hands: penalty === "one_hand" ? 1 : state.rules.hands,
    discards:
      penalty === "no_discards"
        ? 0
        : state.rules.discards +
          3 *
            context.jokers.filter((j) => j.kind === "merry_andy").length,
    hand: sortByRank(shuffled.items.slice(0, limit)),
    deck: shuffled.items.slice(limit),
    used: [],
    deckRng: shuffled.state,
    offers: [],
    pack: null,
    rerollCost: CONFIG.reroll,
    lastScore: null,
    lastPlayed: [],
    reward: null,
    locked: false,
    forcedCardId: null,
    playedHandTypes: [],
    roundHandCounts: {},
  });
}

function stockShop(
  state: GameState,
  excluded: readonly JokerId[] = [],
): GameState {
  const roll = sampleJokers(CONFIG.offers, state.shopRng, [
    ...excluded,
    ...state.jokers.map((joker) => joker.kind),
  ]);
  const offers: Offer[] = roll.items
    .slice(0, CONFIG.offers)
    .map((kind, index) => ({ kind, id: state.nextId + index, sold: false }));
  const prepared = prepareJokerTargets(offers, state.round + 1, roll.state);
  return {
    ...state,
    phase: "shop",
    offers: prepared.items,
    shopRng: prepared.state,
    nextId: state.nextId + CONFIG.offers,
  };
}

function selectedCards(
  state: GameState,
  ids: readonly number[],
): Card[] | null {
  const selected = new Set(ids);
  if (ids.length < 1 || ids.length > 5 || selected.size !== ids.length)
    return null;
  const cards = state.hand.filter((card) => selected.has(card.id));
  return cards.length === ids.length ? cards : null;
}

function refill(state: GameState): GameState {
  const count = Math.min(
    Math.max(0, handLimit(state) - state.hand.length),
    state.deck.length,
  );
  const hand = sortByRank([...state.hand, ...state.deck.slice(0, count)]);
  const deck = state.deck.slice(count);
  return refreshForced({
    ...state,
    hand,
    deck,
    phase: hand.length === 0 && deck.length === 0 ? "lost" : state.phase,
  });
}

function reorder<T extends { readonly id: number }>(
  items: readonly T[],
  ids: readonly number[],
): T[] | null {
  if (items.length !== ids.length || new Set(ids).size !== items.length)
    return null;
  const map = new Map(items.map((item) => [item.id, item]));
  if (ids.some((id) => !map.has(id))) return null;
  return ids.map((id) => map.get(id)!);
}

export function gameReducer(state: GameState, action: Action): GameState {
  if (action.type === "resume")
    return state.phase === "ready" ? action.state : state;
  if (action.type === "restart")
    return startRound(createGame(action.seed, state.rules), 1);
  if (action.type === "animationDone")
    return state.locked ? refreshDisabled({ ...state, locked: false }) : state;
  if (state.locked) return state;
  if (
    state.pack?.status === "open" &&
    ["buy", "reroll", "nextRound"].includes(action.type)
  )
    return state;
  switch (action.type) {
    case "configure":
      return state.phase === "ready" && validRules(action.rules)
        ? createGame(state.seed, action.rules)
        : state;
    case "menu":
      return createGame(action.seed, state.rules);
    case "start":
      return state.phase === "ready" ? startRound(state, 1) : state;
    case "play": {
      if (state.phase !== "playing" || state.hands <= 0) return state;
      const cards = selectedCards(state, action.ids);
      if (!cards || playProblem(state, cards)) return state;
      const result = scorePlay(state, cards);
      const prepared = preparePlay(state, cards);
      const ids = new Set(action.ids);
      const next: GameState = {
        ...state,
        ...prepared,
        stagePlayedCards: [
          ...new Set([
            ...state.stagePlayedCards,
            ...cards.map((card) => `${card.suit}:${card.rank}`),
          ]),
        ],
        runHandCounts: {
          ...state.runHandCounts,
          [result.hand]: (state.runHandCounts[result.hand] ?? 0) + 1,
        },
        roundHandCounts: state.roundHandCounts
          ? {
              ...state.roundHandCounts,
              [result.hand]: (state.roundHandCounts[result.hand] ?? 0) + 1,
            }
          : undefined,
        hands: state.hands - 1,
        hand: state.hand.filter((card) => !ids.has(card.id)),
        used: [...state.used, ...cards],
        lastPlayed: cards,
        lastScore: result,
        playedHandTypes: state.playedHandTypes.includes(result.hand)
          ? state.playedHandTypes
          : [...state.playedHandTypes, result.hand],
        score: state.score + result.score,
        locked: true,
      };
      if (next.score >= targetScore(state)) {
        const baseReward = CONFIG.rewards[(state.round - 1) % 3];
        const reward = {
          base: baseReward,
          hands: next.hands,
          interest: Math.min(5, Math.floor(state.money / 5)),
          total:
            baseReward + next.hands + Math.min(5, Math.floor(state.money / 5)),
        };
        return {
          ...next,
          phase:
            state.round === state.rules.targets.length ? "won" : "roundWon",
          reward,
          forcedCardId: null,
          money: state.money + reward.total,
        };
      }
      if (next.hands === 0) return { ...next, phase: "lost" };
      return refill(next);
    }
    case "discard": {
      if (state.phase !== "playing" || state.discards <= 0) return state;
      const cards = selectedCards(state, action.ids);
      if (
        !cards ||
        (activePenalty(state) === "forced_card" &&
          state.forcedCardId !== null &&
          !action.ids.includes(state.forcedCardId))
      )
        return state;
      const ids = new Set(action.ids);
      return refill({
        ...state,
        discards: state.discards - 1,
        jokers: afterDiscard(state, cards),
        hand: state.hand.filter((card) => !ids.has(card.id)),
        used: [...state.used, ...cards],
      });
    }
    case "enterShop": {
      if (state.phase !== "roundWon") return state;
      const packs = samplePack(state.packRng, state.rules.packWeights);
      return stockShop({
        ...state,
        ...roundJokers(state, state.round + 1),
        packRng: packs.state,
        pack: {
          kind: packs.kind,
          status: "sealed",
          choices: [],
          remaining: 0,
        },
      });
    }
    case "nextRound":
      return state.phase === "shop" && state.round < state.rules.targets.length
        ? startRound(state, state.round + 1)
        : state;
    case "reroll":
      return state.phase === "shop" && state.money >= state.rerollCost
        ? stockShop(
            {
              ...state,
              money: state.money - state.rerollCost,
              rerollCost: state.rerollCost + 1,
            },
            state.offers.map((offer) => offer.kind),
          )
        : state;
    case "buy": {
      if (state.phase !== "shop" || state.jokers.length >= CONFIG.slots)
        return state;
      const offer = state.offers.find(
        (item) => item.id === action.id && !item.sold,
      );
      if (
        !offer ||
        state.money < JOKERS[offer.kind].price ||
        state.jokers.some((joker) => joker.kind === offer.kind)
      )
        return state;
      const { sold: _sold, ...purchased } = offer;
      return {
        ...state,
        money: state.money - JOKERS[offer.kind].price,
        jokers: [...state.jokers, purchased],
        offers: state.offers.map((item) =>
          item.id === action.id ? { ...item, sold: true } : item,
        ),
      };
    }
    case "openPack": {
      if (state.phase !== "shop" || state.pack?.status !== "sealed")
        return state;
      const definition = PACKS[state.pack.kind];
      if (state.money < definition.price) return state;
      const roll = sampleJokers(
        definition.cards,
        state.packRng,
        state.jokers.map((joker) => joker.kind),
      );
      const choices = roll.items
        .slice(0, definition.cards)
        .map((kind, index) => ({
          kind,
          id: state.nextId + index,
          sold: false,
        }));
      const prepared = prepareJokerTargets(
        choices,
        state.round + 1,
        roll.state,
      );
      return {
        ...state,
        money: state.money - definition.price,
        packRng: prepared.state,
        nextId: state.nextId + choices.length,
        pack: {
          ...state.pack,
          status: "open",
          choices: prepared.items,
          remaining: definition.picks,
        },
      };
    }
    case "choosePack": {
      if (
        state.phase !== "shop" ||
        state.pack?.status !== "open" ||
        state.pack.remaining <= 0 ||
        state.jokers.length >= CONFIG.slots
      )
        return state;
      const choice = state.pack.choices.find(
        (card) => card.id === action.id && !card.sold,
      );
      if (!choice || state.jokers.some((joker) => joker.kind === choice.kind))
        return state;
      const remaining = state.pack.remaining - 1;
      const { sold: _sold, ...picked } = choice;
      return {
        ...state,
        jokers: [...state.jokers, picked],
        pack: {
          ...state.pack,
          remaining,
          status: remaining === 0 ? "spent" : "open",
          choices: state.pack.choices.map((card) =>
            card.id === choice.id ? { ...card, sold: true } : card,
          ),
        },
      };
    }
    case "skipPack":
      return state.phase === "shop" && state.pack?.status === "open"
        ? { ...state, pack: { ...state.pack, status: "spent", remaining: 0 } }
        : state;
    case "sell": {
      if (state.phase !== "shop") return state;
      const joker = state.jokers.find((item) => item.id === action.id);
      return joker
        ? {
            ...state,
            money: state.money + JOKERS[joker.kind].sell,
            jokers: state.jokers.filter((item) => item.id !== action.id),
          }
        : state;
    }
    case "reorderHand": {
      if (state.phase !== "playing") return state;
      const hand = reorder(state.hand, action.ids);
      return hand ? { ...state, hand } : state;
    }
    case "reorderJokers": {
      if (state.phase !== "playing" && state.phase !== "shop") return state;
      const jokers = reorder(state.jokers, action.ids);
      return jokers ? { ...state, jokers } : state;
    }
  }
}
