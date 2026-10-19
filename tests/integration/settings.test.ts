import { expect, it } from "vitest";
import { createGame, gameReducer } from "../../src/game/reducer";
import { DEFAULT_RULES } from "../../src/game/rules";
import { createDeck } from "../../src/game/deck";
it("TC-049: main-menu game parameters take effect when a run starts and stay fixed", () => {
  const rules = {
    ...DEFAULT_RULES,
    hands: 6,
    discards: 2,
    money: 20,
    targets: [100, 200, 500, 600, 700, 800, 900, 1000, 1100] as const,
  };
  const menu = gameReducer(createGame(1), { type: "configure", rules });
  const game = gameReducer(menu, { type: "start" });
  expect(game).toMatchObject({ hands: 6, discards: 2, money: 20, rules });
  expect(gameReducer(game, { type: "configure", rules: DEFAULT_RULES })).toBe(
    game,
  );
});
it("TC-050: target, round reset and restart all respect the run rules", () => {
  const rules = {
    ...DEFAULT_RULES,
    hands: 6,
    discards: 2,
    money: 20,
    targets: [50, 100, 150, 200, 250, 300, 350, 400, 450] as const,
  };
  let game = gameReducer(
    gameReducer(createGame(1), { type: "configure", rules }),
    { type: "start" },
  );
  const deck = createDeck(),
    pair = deck.filter((c) => c.rank === "10").slice(0, 2);
  game = { ...game, hand: pair, deck: deck.filter((c) => !pair.includes(c)) };
  game = gameReducer(game, { type: "play", ids: pair.map((c) => c.id) });
  expect(game).toMatchObject({
    phase: "roundWon",
    score: 60,
    hands: 5,
    money: 32,
  });
  game = gameReducer(game, { type: "animationDone" });
  game = gameReducer(game, { type: "enterShop" });
  game = gameReducer(game, { type: "nextRound" });
  expect(game).toMatchObject({
    round: 2,
    hands: 6,
    discards: 2,
    money: 32,
    rules,
  });
  expect(gameReducer(game, { type: "restart", seed: 3 })).toMatchObject({
    phase: "playing",
    hands: 6,
    money: 20,
    rules,
  });
  expect(gameReducer(game, { type: "menu", seed: 3 })).toMatchObject({
    phase: "ready",
    money: 20,
    jokers: [],
    rules,
  });
});
