import type { HandId, JokerId, Rank, Suit, PackId, Rarity } from "./types";

export const CONFIG = {
  targets: [300, 450, 600, 2000, 3000, 4000, 10000, 15000, 20000],
  handSize: 8,
  hands: 4,
  discards: 4,
  money: 5,
  slots: 6,
  rewards: [3, 3, 5],
  offers: 2,
  reroll: 1,
} as const;
export const SUITS: readonly Suit[] = ["spades", "hearts", "diamonds", "clubs"];
export const RANKS: readonly Rank[] = [
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
  "A",
];
export const SUIT_SYMBOLS: Record<Suit, string> = {
  spades: "♠",
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
};
export const HANDS: Record<HandId, { chips: number; mult: number }> = {
  high: { chips: 5, mult: 1 },
  pair: { chips: 10, mult: 2 },
  twoPair: { chips: 20, mult: 2 },
  three: { chips: 30, mult: 3 },
  straight: { chips: 30, mult: 4 },
  flush: { chips: 35, mult: 4 },
  fullHouse: { chips: 40, mult: 4 },
  four: { chips: 60, mult: 7 },
  straightFlush: { chips: 100, mult: 8 },
};
export const JOKERS: Record<
  JokerId,
  {
    rarity: Rarity;
    price: number;
    sell: number;
    art: number;
    color: string;
  }
> = {
  banner: {
    rarity: "common",
    price: 5,
    sell: 2,
    art: 0,
    color: "#59baff",
  },
  joker: {
    rarity: "common",
    price: 2,
    sell: 1,
    art: 1,
    color: "#ff8877",
  },
  abstract_joker: {
    rarity: "common",
    price: 4,
    sell: 2,
    art: 2,
    color: "#f6ce79",
  },
  card_sharp: {
    rarity: "uncommon",
    price: 6,
    sell: 3,
    art: 3,
    color: "#c5a1ff",
  },
  blue_joker: {
    rarity: "common",
    price: 5,
    sell: 2,
    art: 4,
    color: "#8fddb4",
  },
  ancient_joker: {
    rarity: "rare",
    price: 8,
    sell: 4,
    art: 5,
    color: "#ef8276",
  },
  blueprint: { rarity: "rare", price: 10, sell: 5, art: 6, color: "#ef8276" },
  castle: { rarity: "uncommon", price: 6, sell: 3, art: 7, color: "#6cce98" },
  even_steven: {
    rarity: "common",
    price: 4,
    sell: 2,
    art: 8,
    color: "#64b8f1",
  },
  fibonacci: {
    rarity: "uncommon",
    price: 7,
    sell: 3,
    art: 9,
    color: "#6cce98",
  },
  flower_pot: {
    rarity: "uncommon",
    price: 6,
    sell: 3,
    art: 10,
    color: "#6cce98",
  },
  four_fingers: {
    rarity: "common",
    price: 7,
    sell: 3,
    art: 11,
    color: "#64b8f1",
  },
  gluttonous_joker: {
    rarity: "common",
    price: 5,
    sell: 2,
    art: 12,
    color: "#64b8f1",
  },
  greedy_joker: {
    rarity: "common",
    price: 5,
    sell: 2,
    art: 13,
    color: "#64b8f1",
  },
  green_joker: {
    rarity: "common",
    price: 4,
    sell: 2,
    art: 14,
    color: "#64b8f1",
  },
  hack: { rarity: "uncommon", price: 6, sell: 3, art: 15, color: "#6cce98" },
  half_joker: {
    rarity: "common",
    price: 5,
    sell: 2,
    art: 16,
    color: "#64b8f1",
  },
  lusty_joker: {
    rarity: "common",
    price: 5,
    sell: 2,
    art: 17,
    color: "#64b8f1",
  },
  merry_andy: {
    rarity: "uncommon",
    price: 7,
    sell: 3,
    art: 18,
    color: "#6cce98",
  },
  misprint: { rarity: "common", price: 4, sell: 2, art: 19, color: "#64b8f1" },
  pareidolia: {
    rarity: "uncommon",
    price: 5,
    sell: 2,
    art: 20,
    color: "#6cce98",
  },
  photograph: {
    rarity: "common",
    price: 5,
    sell: 2,
    art: 21,
    color: "#64b8f1",
  },
  scary_face: {
    rarity: "common",
    price: 4,
    sell: 2,
    art: 22,
    color: "#64b8f1",
  },
  seeing_double: {
    rarity: "uncommon",
    price: 6,
    sell: 3,
    art: 23,
    color: "#6cce98",
  },
  shortcut: {
    rarity: "uncommon",
    price: 7,
    sell: 3,
    art: 24,
    color: "#6cce98",
  },
  smeared_joker: {
    rarity: "uncommon",
    price: 7,
    sell: 3,
    art: 25,
    color: "#6cce98",
  },
  smiley_face: {
    rarity: "common",
    price: 4,
    sell: 2,
    art: 26,
    color: "#64b8f1",
  },
  sock_and_buskin: {
    rarity: "uncommon",
    price: 6,
    sell: 3,
    art: 27,
    color: "#6cce98",
  },
  splash: { rarity: "common", price: 3, sell: 1, art: 28, color: "#64b8f1" },
  square_joker: {
    rarity: "common",
    price: 4,
    sell: 2,
    art: 29,
    color: "#64b8f1",
  },
  supernova: {
    rarity: "uncommon",
    price: 5,
    sell: 2,
    art: 30,
    color: "#6cce98",
  },
  the_order: { rarity: "rare", price: 8, sell: 4, art: 31, color: "#ef8276" },
  wrathful_joker: {
    rarity: "common",
    price: 5,
    sell: 2,
    art: 32,
    color: "#64b8f1",
  },
};
export const JOKER_IDS = Object.keys(JOKERS) as JokerId[];

export const PACKS: Record<
  PackId,
  { price: number; cards: number; picks: number }
> = {
  buffoon: { price: 4, cards: 2, picks: 1 },
  jumbo: { price: 6, cards: 3, picks: 1 },
  mega: { price: 8, cards: 4, picks: 2 },
};

export const DEFAULT_PACK_WEIGHTS: Record<PackId, number> = {
  buffoon: 1,
  jumbo: 1,
  mega: 1,
};
