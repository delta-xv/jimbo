import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, it } from "vitest";
import { RunOutcome } from "../../../src/ui/RunOutcome";
import { I18nProvider } from "../../../src/i18n/I18n";
it.each(["won", "lost"] as const)(
  "TC-145: %s uses a fixed English headline and shows immediate actions without animation",
  (outcome) => {
    const html = renderToStaticMarkup(
      createElement(I18nProvider, {
        initialLocale: "zh-CN",
        children: createElement(RunOutcome, {
          outcome,
          enabled: false,
          scale: 1,
          backRef: { current: () => {} },
          onAgain: () => {},
          onMenu: () => {},
        }),
      }),
    );
    expect(html).toContain(outcome === "won" ? "YOU WIN!" : "GAME OVER");
    expect(html).toContain("再来一局");
    expect(html).toContain("主菜单");
    expect(html).toContain('data-outcome-phase="ready"');
    expect(html).not.toContain("result-score");
    expect(html).not.toContain("reward-breakdown");
  },
);
