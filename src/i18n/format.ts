import type { Card, ScoreStep } from "../game/types";
import { SUIT_SYMBOLS } from "../game/config";
import type { Locale } from "./locale";
import {
  en,
  zh,
  handNames,
  jokerTexts,
  suitNames,
  type MessageKey,
} from "./messages";

const numberFormats = {
  en: new Intl.NumberFormat("en", { maximumFractionDigits: 2 }),
  "zh-CN": new Intl.NumberFormat("zh-CN", { maximumFractionDigits: 2 }),
};
export function formatNumber(value: number, locale: Locale): string {
  return numberFormats[locale].format(value);
}
export function translate(
  locale: Locale,
  key: MessageKey,
  params: Record<string, string | number> = {},
): string {
  return (locale === "en" ? en[key] : zh[key]).replace(
    /\{(\w+)\}/g,
    (match, key: string) => String(params[key] ?? match),
  );
}
export function cardName(
  card: Pick<Card, "rank" | "suit">,
  locale: Locale,
): string {
  return locale === "en"
    ? `${card.rank} of ${suitNames.en[card.suit]}`
    : `${suitNames["zh-CN"][card.suit]}${card.rank}`;
}
export function formatStep(
  step: ScoreStep,
  locale: Locale,
): { source: string; detail: string } {
  switch (step.kind) {
    case "hand":
      return {
        source: handNames[locale][step.hand],
        detail: translate(locale, "baseHand"),
      };
    case "card":
      return {
        source: step.rank + SUIT_SYMBOLS[step.suit],
        detail: translate(locale, "cardChips", {
          amount: formatNumber(step.amount, locale),
        }),
      };
    case "debuff":
      return {
        source: step.rank + SUIT_SYMBOLS[step.suit],
        detail: translate(locale, "cardDebuffed"),
      };
    case "joker":
      return {
        source: jokerTexts[locale][step.joker].name,
        detail: translate(
          locale,
          step.operation === "retrigger"
            ? "jokerRetrigger"
            : step.operation === "chips"
              ? "cardChips"
              : step.operation === "mult"
                ? "jokerMult"
                : "jokerMultiply",
          { amount: step.amount },
        ),
      };
  }
}
