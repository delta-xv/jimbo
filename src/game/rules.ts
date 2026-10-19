import { TOTAL_ROUNDS } from "./progression";
import type { PackId } from "./types";
import { CONFIG, DEFAULT_PACK_WEIGHTS } from "./config";
export interface RunRules {
  readonly hands: number;
  readonly discards: number;
  readonly money: number;
  readonly targets: readonly number[];
  readonly packWeights?: Readonly<Record<PackId, number>>;
}
export const DEFAULT_RULES: RunRules = {
  hands: CONFIG.hands,
  discards: CONFIG.discards,
  money: CONFIG.money,
  targets: CONFIG.targets,
  packWeights: DEFAULT_PACK_WEIGHTS,
};
function integer(value: unknown, min: number, max: number): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}
export function validRules(value: unknown): value is RunRules {
  if (typeof value !== "object" || value === null) return false;
  const rules = value as Record<string, unknown>;
  return (
    (rules.packWeights === undefined ||
      validWeights(rules.packWeights, ["buffoon", "jumbo", "mega"])) &&
    integer(rules.hands, 1, 10) &&
    integer(rules.discards, 0, 10) &&
    integer(rules.money, 0, 99) &&
    Array.isArray(rules.targets) &&
    rules.targets.length === TOTAL_ROUNDS &&
    rules.targets.every((v) => integer(v, 50, 50000)) &&
    rules.targets.every(
      (value, index, all) => index === 0 || all[index - 1] < value,
    )
  );
}
export function copyRules(rules: RunRules): RunRules {
  return {
    hands: rules.hands,
    discards: rules.discards,
    money: rules.money,
    targets: [...rules.targets],
    ...(rules.packWeights ? { packWeights: { ...rules.packWeights } } : {}),
  };
}

function validWeights(value: unknown, keys: readonly string[]): boolean {
  if (typeof value !== "object" || value === null) return false;
  const record = value as Record<string, unknown>;
  return (
    Object.keys(record).length === keys.length &&
    keys.every((key) => integer(record[key], 1, 100))
  );
}
