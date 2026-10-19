import type { PenaltyId } from "./progression";
import type { RunRules } from "./rules";
export type Suit = "spades" | "hearts" | "diamonds" | "clubs";
export type Rank =
  "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9" | "10" | "J" | "Q" | "K" | "A";
export interface Card {
  readonly id: number;
  readonly suit: Suit;
  readonly rank: Rank;
}
export type HandId =
  | "high"
  | "pair"
  | "twoPair"
  | "three"
  | "straight"
  | "flush"
  | "fullHouse"
  | "four"
  | "straightFlush";
export type JokerId =
  | "banner"
  | "joker"
  | "abstract_joker"
  | "card_sharp"
  | "blue_joker"
  | "ancient_joker"
  | "blueprint"
  | "castle"
  | "even_steven"
  | "fibonacci"
  | "flower_pot"
  | "four_fingers"
  | "gluttonous_joker"
  | "greedy_joker"
  | "green_joker"
  | "hack"
  | "half_joker"
  | "lusty_joker"
  | "merry_andy"
  | "misprint"
  | "pareidolia"
  | "photograph"
  | "scary_face"
  | "seeing_double"
  | "shortcut"
  | "smeared_joker"
  | "smiley_face"
  | "sock_and_buskin"
  | "splash"
  | "square_joker"
  | "supernova"
  | "the_order"
  | "wrathful_joker";
export type Rarity = "common" | "uncommon" | "rare";
export interface Joker {
  readonly id: number;
  readonly kind: JokerId;
  readonly value?: number;
  readonly targetSuit?: Suit;
  readonly targetRound?: number;
}
export interface Offer extends Joker {
  readonly sold: boolean;
}
export type PackId = "buffoon" | "jumbo" | "mega";
export interface BoosterPack {
  readonly kind: PackId;
  readonly status: "sealed" | "open" | "spent";
  readonly choices: readonly Offer[];
  readonly remaining: number;
}
export type ScoreStep = (
  | { readonly kind: "hand"; readonly hand: HandId }
  | {
      readonly kind: "card";
      readonly rank: Rank;
      readonly suit: Suit;
      readonly amount: number;
    }
  | {
      readonly kind: "joker";
      readonly joker: JokerId;
      readonly instanceId: number;
      readonly operation: "chips" | "mult" | "multiply" | "retrigger";
      readonly amount: number;
    }
  | { readonly kind: "debuff"; readonly rank: Rank; readonly suit: Suit }
) & { readonly chips: number; readonly mult: number };
export interface ScoreResult {
  readonly hand: HandId;
  readonly scoringIds: readonly number[];
  readonly debuffedIds: readonly number[];
  readonly chips: number;
  readonly mult: number;
  readonly score: number;
  readonly steps: readonly ScoreStep[];
}
export type HandPreview = Pick<ScoreResult, "hand" | "chips" | "mult">;
export type Phase = "ready" | "playing" | "roundWon" | "shop" | "won" | "lost";
export interface Reward {
  readonly base: number;
  readonly hands: number;
  readonly interest: number;
  readonly total: number;
}
export interface GameState {
  readonly rules: RunRules;
  readonly penalties: readonly PenaltyId[];
  readonly penaltyRng: number;
  readonly forcedCardId: number | null;
  readonly disabledJokerId: number | null;
  readonly playedHandTypes: readonly HandId[];
  readonly stagePlayedCards: readonly string[];
  readonly runHandCounts: Partial<Record<HandId, number>>;
  readonly roundHandCounts?: Partial<Record<HandId, number>>;
  readonly effectRng: number;
  readonly seed: number;
  readonly phase: Phase;
  readonly round: number;
  readonly score: number;
  readonly hands: number;
  readonly discards: number;
  readonly money: number;
  readonly hand: readonly Card[];
  readonly deck: readonly Card[];
  readonly used: readonly Card[];
  readonly jokers: readonly Joker[];
  readonly offers: readonly Offer[];
  readonly pack: BoosterPack | null;
  readonly packRng: number;
  readonly rerollCost: number;
  readonly deckRng: number;
  readonly shopRng: number;
  readonly nextId: number;
  readonly lastScore: ScoreResult | null;
  readonly lastPlayed: readonly Card[];
  readonly reward: Reward | null;
  readonly locked: boolean;
}
export type Action =
  | { type: "resume"; state: GameState }
  | { type: "start" }
  | { type: "configure"; rules: RunRules }
  | { type: "menu"; seed: number }
  | { type: "play" | "discard"; ids: readonly number[] }
  | { type: "animationDone" }
  | { type: "enterShop" | "nextRound" | "reroll" }
  | { type: "openPack" | "skipPack" }
  | { type: "buy" | "sell" | "choosePack"; id: number }
  | { type: "reorderHand" | "reorderJokers"; ids: readonly number[] }
  | { type: "restart"; seed: number };
