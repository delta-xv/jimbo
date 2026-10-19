import { prepareJokerTargets } from "../game/jokerState";
import { HANDS, JOKERS, PACKS, RANKS, SUITS } from "../game/config";
import { PENALTY_IDS } from "../game/progression";
import { gameReducer } from "../game/reducer";
import { validRules } from "../game/rules";
import type { GameState } from "../game/types";
import { readStored, writeStored, removeStored } from "../storage/storage";

export const RUN_KEY = "jimbo:run";
const VERSION = 1;
const RULES_VERSION = 3;
export type SavedRun = {
  status: "ok" | "empty" | "invalid" | "unsupported" | "unavailable";
  state: GameState | null;
};
const object = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v);
const int = (v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): v is number =>
  typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const number = (v: unknown) =>
  typeof v === "number" && Number.isFinite(v) && v >= 0;
const array = (v: unknown, check: (item: unknown) => boolean) =>
  Array.isArray(v) && v.every(check);
const member = (v: unknown, list: readonly string[]) =>
  typeof v === "string" && list.includes(v);
const card = (v: unknown) =>
  object(v) && int(v.id, 1) && member(v.rank, RANKS) && member(v.suit, SUITS);
const joker = (v: unknown) =>
  object(v) &&
  int(v.id, 1) &&
  typeof v.kind === "string" &&
  Object.hasOwn(JOKERS, v.kind) &&
  (v.value === undefined || number(v.value)) &&
  (v.targetSuit === undefined || member(v.targetSuit, SUITS)) &&
  (v.targetRound === undefined || int(v.targetRound, 1, 9));
const offer = (v: unknown) =>
  joker(v) && object(v) && typeof v.sold === "boolean";
const hand = (v: unknown) => typeof v === "string" && Object.hasOwn(HANDS, v);
const unique = (v: readonly unknown[]) => new Set(v).size === v.length;
function score(v: unknown): boolean {
  if (
    !object(v) ||
    !hand(v.hand) ||
    !number(v.chips) ||
    !number(v.mult) ||
    !int(v.score) ||
    !array(v.scoringIds, (id) => int(id, 1)) ||
    !array(v.debuffedIds, (id) => int(id, 1)) ||
    !Array.isArray(v.steps)
  )
    return false;
  return v.steps.every(
    (s) =>
      object(s) &&
      number(s.chips) &&
      number(s.mult) &&
      (s.kind === "hand"
        ? hand(s.hand)
        : s.kind === "card"
          ? member(s.rank, RANKS) && member(s.suit, SUITS) && number(s.amount)
          : s.kind === "debuff"
            ? member(s.rank, RANKS) && member(s.suit, SUITS)
            : s.kind === "joker" &&
              typeof s.joker === "string" &&
              Object.hasOwn(JOKERS, s.joker) &&
              int(s.instanceId, 1) &&
              member(s.operation, ["chips", "mult", "multiply", "retrigger"]) &&
              number(s.amount)),
  );
}
function validState(v: unknown): v is GameState {
  if (
    !object(v) ||
    !validRules(v.rules) ||
    !member(v.phase, ["playing", "roundWon", "shop"]) ||
    !int(v.round, 1, 9) ||
    !int(v.hands, 0, 10) ||
    !int(v.discards, 0, 13) ||
    !int(v.money) ||
    !int(v.score) ||
    !int(v.nextId, 1000) ||
    !int(v.rerollCost, 1) ||
    typeof v.locked !== "boolean" ||
    !["seed", "penaltyRng", "effectRng", "deckRng", "shopRng", "packRng"].every(
      (key) => int(v[key], 0, 0xffffffff),
    ) ||
    !array(v.penalties, (p) => member(p, PENALTY_IDS)) ||
    (v.penalties as unknown[]).length !== 3 ||
    !unique(v.penalties as unknown[]) ||
    !array(v.playedHandTypes, hand) ||
    !object(v.runHandCounts) ||
    !Object.entries(v.runHandCounts).every(([key, n]) => hand(key) && int(n)) ||
    (v.roundHandCounts !== undefined &&
      (!object(v.roundHandCounts) ||
        !Object.entries(v.roundHandCounts).every(([key, n]) => hand(key) && int(n)))) ||
    !array(
      v.stagePlayedCards,
      (p) =>
        typeof p === "string" &&
        SUITS.some((suit) => RANKS.some((rank) => p === `${suit}:${rank}`)),
    ) ||
    !array(v.hand, card) ||
    !array(v.deck, card) ||
    !array(v.used, card) ||
    !array(v.lastPlayed, card) ||
    !array(v.jokers, joker) ||
    !array(v.offers, offer) ||
    (v.lastScore !== null && !score(v.lastScore))
  )
    return false;
  const s = v as unknown as GameState;
  const cards = [...s.hand, ...s.deck, ...s.used];
  if (s.phase === "playing" && (s.hands === 0 || s.hand.length === 0))
    return false;
  if (
    cards.length !== 52 ||
    !unique(cards.map((c) => c.id)) ||
    !unique(cards.map((c) => `${c.suit}:${c.rank}`)) ||
    s.hand.length > 8 ||
    s.jokers.length > 6 ||
    !unique(s.jokers.map((j) => j.kind)) ||
    !unique(s.jokers.map((j) => j.id)) ||
    s.offers.length > 2 ||
    !unique(s.offers.map((o) => o.kind)) ||
    (s.forcedCardId !== null && !s.hand.some((c) => c.id === s.forcedCardId)) ||
    (s.disabledJokerId !== null &&
      !s.jokers.some((j) => j.id === s.disabledJokerId))
  )
    return false;
  if (
    s.reward !== null &&
    (!object(s.reward) ||
      ![s.reward.base, s.reward.hands, s.reward.interest, s.reward.total].every(
        (n) => int(n),
      ) ||
      s.reward.total !== s.reward.base + s.reward.hands + s.reward.interest)
  )
    return false;
  if (s.pack !== null) {
    if (
      !object(s.pack) ||
      !member(s.pack.kind, Object.keys(PACKS)) ||
      !member(s.pack.status, ["sealed", "open", "spent"]) ||
      !array(s.pack.choices, offer) ||
      !int(s.pack.remaining, 0, 2) ||
      s.pack.choices.length > PACKS[s.pack.kind].cards ||
      !unique(s.pack.choices.map((c) => c.kind)) ||
      (s.pack.status === "open" &&
        (s.pack.remaining < 1 ||
          s.pack.choices.filter((c) => !c.sold).length < s.pack.remaining))
    )
      return false;
  }
  return true;
}
export function serializeRun(state: GameState): string | null {
  if (!["playing", "roundWon", "shop"].includes(state.phase)) return null;
  return JSON.stringify({
    version: VERSION,
    rulesVersion: RULES_VERSION,
    state: gameReducer(state, { type: "animationDone" }),
  });
}
export function parseRun(text: string | null): SavedRun {
  if (text === null) return { status: "empty", state: null };
  try {
    const data: unknown = JSON.parse(text);
    if (!object(data)) return { status: "invalid", state: null };
    if (data.version !== VERSION)
      return {
        status: typeof data.version === "number" ? "unsupported" : "invalid",
        state: null,
      };
    if (data.rulesVersion !== RULES_VERSION && data.rulesVersion !== 2)
      return { status: "unsupported", state: null };
    if (!validState(data.state)) return { status: "invalid", state: null };
    let state = data.state;
    if (data.rulesVersion === 2) {
      const upcoming = state.phase === "shop";
      const round = state.round + (upcoming ? 1 : 0);
      const owned = upcoming
        ? state.jokers
        : state.jokers.map((joker) =>
            joker.targetSuit ? { ...joker, targetRound: round } : joker,
          );
      const jokers = prepareJokerTargets(owned, round, state.effectRng);
      const inheritTarget = <T extends GameState["jokers"][number]>(item: T): T => {
        const ownedJoker = jokers.items.find((joker) => joker.id === item.id);
        return ownedJoker
          ? {
              ...item,
              targetSuit: ownedJoker.targetSuit,
              targetRound: ownedJoker.targetRound,
            }
          : item;
      };
      const offers = prepareJokerTargets(
        state.offers.map(inheritTarget),
        round,
        state.shopRng,
      );
      const choices = prepareJokerTargets(
        state.pack?.choices.map(inheritTarget) ?? [],
        round,
        state.packRng,
      );
      state = {
        ...state,
        jokers: jokers.items,
        effectRng: jokers.state,
        offers: offers.items,
        shopRng: offers.state,
        pack: state.pack ? { ...state.pack, choices: choices.items } : null,
        packRng: choices.state,
      };
    }
    return {
      status: "ok",
      state: gameReducer(state, { type: "animationDone" }),
    };
  } catch {
    return { status: "invalid", state: null };
  }
}
export function loadRun(): SavedRun {
  try {
    return parseRun(readStored(RUN_KEY));
  } catch {
    return { status: "unavailable", state: null };
  }
}
export function saveRun(state: GameState): boolean {
  if (state.phase === "ready") return true;
  try {
    const text = serializeRun(state);
    if (text === null) removeStored(RUN_KEY);
    else writeStored(RUN_KEY, text);
    return true;
  } catch {
    return false;
  }
}
