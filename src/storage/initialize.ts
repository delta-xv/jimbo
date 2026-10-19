import { LOCALE_KEY } from "../i18n/locale";
import { parseRun, RUN_KEY } from "../save/run";
import { SETTINGS_KEY, validateSettings } from "../settings/settings";
import { TUTORIAL_SEEN_KEY } from "../tutorial/practice";
import { initializeStorage } from "./storage";

export function prepareStorage(): Promise<void> {
  return initializeStorage({
    [RUN_KEY]: (value) => parseRun(value).status === "ok",
    [SETTINGS_KEY]: (value) => {
      try {
        return validateSettings(JSON.parse(value)) !== null;
      } catch {
        return false;
      }
    },
    [LOCALE_KEY]: (value) => value === "en" || value === "zh-CN",
    [TUTORIAL_SEEN_KEY]: (value) => value === "yes",
  });
}
