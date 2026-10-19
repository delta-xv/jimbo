import { expect, it } from "vitest";
import { resolveLocale } from "../../../src/i18n/locale";

it("TC-040: explicit language preference takes priority over browser language", () => {
  expect(resolveLocale("en", "zh-CN")).toBe("en");
  expect(resolveLocale("zh-CN", "en-US")).toBe("zh-CN");
});
it("TC-041: first visit and invalid preferences fall back to supported browser language", () => {
  expect(resolveLocale(null, "en-US")).toBe("en");
  expect(resolveLocale(null, "zh-TW")).toBe("zh-CN");
  expect(resolveLocale("fr", "zh-CN")).toBe("zh-CN");
  expect(resolveLocale(null, "fr-FR")).toBe("en");
});
