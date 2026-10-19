import { createElement } from "react";
import { expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CardFace } from "../../../src/ui/CardFace";
import { RANKS, SUITS } from "../../../src/game/config";
it("TC-139: numbered faces have the correct pip count and court cards have mirrored portraits", () => {
  for (const suit of SUITS)
    for (const rank of RANKS) {
      const html = renderToStaticMarkup(
        createElement(CardFace, { card: { id: 1, rank, suit } }),
      );
      const count = (html.match(/data-pip="true"/g) ?? []).length;
      expect(count).toBe(
        ["J", "Q", "K"].includes(rank) ? 0 : rank === "A" ? 1 : Number(rank),
      );
      if (["J", "Q", "K"].includes(rank))
        expect(html.match(/data-court-half/g)?.length).toBe(2);
    }
});
