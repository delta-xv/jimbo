import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { LOCALE_KEY, loadLocale, type Locale } from "./locale";
import { writeStored } from "../storage/storage";
import { translate, cardName, formatStep, formatNumber } from "./format";
import { handNames, jokerTexts, type MessageKey } from "./messages";
import type { Card, HandId, JokerId, ScoreStep } from "../game/types";

function createText(locale: Locale) {
  return {
    locale,
    t: (key: MessageKey, params?: Record<string, string | number>) =>
      translate(locale, key, params),
    handName: (id: HandId) => handNames[locale][id],
    jokerText: (id: JokerId) => jokerTexts[locale][id],
    cardName: (card: Pick<Card, "rank" | "suit">) => cardName(card, locale),
    formatStep: (step: ScoreStep) => formatStep(step, locale),
    number: (value: number) => formatNumber(value, locale),
  };
}
const Context = createContext<
  | (ReturnType<typeof createText> & { setLocale: (locale: Locale) => void })
  | null
>(null);
export function I18nProvider({
  children,
  initialLocale,
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocale] = useState<Locale>(
    () => initialLocale ?? loadLocale(navigator.language),
  );
  const value = useMemo(() => ({ ...createText(locale), setLocale }), [locale]);
  useEffect(() => {
    document.documentElement.lang = locale;
    document.title = translate(locale, "title");
    try {
      writeStored(LOCALE_KEY, locale);
    } catch {}
  }, [locale]);
  return <Context.Provider value={value}>{children}</Context.Provider>;
}
export function useI18n() {
  const value = useContext(Context);
  if (!value) throw new Error("I18nProvider is required");
  return value;
}
