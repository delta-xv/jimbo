import { expect, it } from "vitest";
import { defaultSettings, parseSettings } from "../../../src/settings/settings";
it("TC-051: preference storage accepts known schema and recovers corrupt settings", () => {
  const configured = {
    ...defaultSettings(),
    animation: "fast" as const,
    crt: false,
    rules: {
      hands: 8,
      discards: 0,
      money: 0,
      targets: [100, 200, 300, 400, 500, 600, 700, 800, 900] as const,
    },
  };
  expect(parseSettings(JSON.parse(JSON.stringify(configured)))).toEqual(
    configured,
  );
  for (const value of [
    null,
    {},
    "invalid",
    { ...configured, version: 99 },
    { ...configured, version: "2" },
    { ...configured, animation: ["fast"] },
    { ...configured, crt: "false" },
    { ...configured, rules: {} },
  ])
    expect(parseSettings(value)).toEqual(defaultSettings());
  const loaded = parseSettings(configured);
  expect(loaded.rules.targets).not.toBe(configured.rules.targets);
});

it("TC-063: old preferences preserve display and resources while migrating to nine base targets", () => {
  const migrated = parseSettings({
    version: 1,
    animation: "fast",
    crt: false,
    rules: { hands: 6, discards: 2, money: 12, targets: [300, 450, 700] },
  });
  expect(migrated).toMatchObject({
    version: 6,
    animation: "fast",
    crt: false,
    rules: { hands: 6, discards: 2, money: 12 },
  });
  expect(migrated.rules.targets).toEqual(defaultSettings().rules.targets);
});
it("TC-104: untouched old defaults migrate while custom rules remain unchanged", () => {
  const old = {
    version: 2,
    animation: "normal",
    crt: true,
    rules: {
      hands: 4,
      discards: 4,
      money: 4,
      targets: [300, 450, 800, 1500, 2500, 4000, 7000, 12000, 20000],
    },
  };
  expect(parseSettings(old)).toEqual(defaultSettings());
  const custom = { ...old, rules: { ...old.rules, money: 20 } };
  expect(parseSettings(custom).rules).toEqual(custom.rules);
});

it("TC-110: legacy rarity weights are discarded while all other saved preferences survive", () => {
  const rules = {
    hands: 6,
    discards: 2,
    money: 20,
    targets: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    packWeights: { buffoon: 3, jumbo: 2, mega: 1 },
  };
  const migrated = parseSettings({
    version: 3,
    animation: "fast",
    crt: false,
    rules: { ...rules, rarityWeights: { common: 60, uncommon: 30, rare: 10 } },
  });
  expect(migrated).toEqual({
    version: 6,
    animation: "fast",
    crt: false,
    audio: defaultSettings().audio,
    rules,
  });
  expect(parseSettings(migrated)).toEqual(migrated);
});

it("TC-118: rematch defaults migrate without resetting custom targets or display preferences", () => {
  const old = {
    version: 4,
    animation: "fast",
    crt: false,
    rules: {
      hands: 4,
      discards: 4,
      money: 5,
      targets: [300, 450, 600, 1000, 1500, 2000, 10000, 15000, 20000],
      packWeights: { buffoon: 2, jumbo: 3, mega: 1 },
    },
  };
  expect(parseSettings(old)).toEqual({
    ...old,
    version: 6,
    audio: defaultSettings().audio,
    rules: {
      ...old.rules,
      targets: [300, 450, 600, 2000, 3000, 4000, 10000, 15000, 20000],
    },
  });
  const custom = {
    ...old,
    rules: {
      ...old.rules,
      targets: [100, 200, 300, 400, 500, 600, 700, 800, 900],
    },
  };
  expect(parseSettings(custom).rules).toEqual(custom.rules);
});

it("TC-138: audio switches migrate safely and persist independently", () => {
  const legacy = {
    ...defaultSettings(),
    version: 5,
    animation: "fast",
    crt: false,
  };
  delete (legacy as Record<string, unknown>).audio;
  expect(parseSettings(legacy)).toMatchObject({
    animation: "fast",
    crt: false,
    audio: { music: true, effects: true, musicVolume: 30, effectsVolume: 65 },
  });
  const configured = {
    ...defaultSettings(),
    audio: { music: false, effects: true, musicVolume: 0, effectsVolume: 100 },
  };
  expect(parseSettings(configured)).toEqual(configured);
  expect(
    parseSettings({
      ...configured,
      audio: {
        music: "false",
        effects: false,
        musicVolume: -1,
        effectsVolume: NaN,
      },
    }).audio,
  ).toEqual({
    music: true,
    effects: false,
    musicVolume: 30,
    effectsVolume: 65,
  });
});
