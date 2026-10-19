import { expect, it } from "vitest";
import { insertJoker, closestSlot } from "../../../src/ui/jokerDrag";
it("TC-144: dragging inserts at either end without swapping or losing neighbors", () => {
  const ids = [1, 2, 3, 4, 5, 6];
  expect(insertJoker(ids, 1, 5)).toEqual([2, 3, 4, 5, 6, 1]);
  expect(insertJoker(ids, 6, 0)).toEqual([6, 1, 2, 3, 4, 5]);
  expect(insertJoker(ids, 2, 3)).toEqual([1, 3, 4, 2, 5, 6]);
  expect(insertJoker(ids, 3, 2)).toBe(ids);
  expect(insertJoker(ids, 99, 2)).toBe(ids);
  expect(ids).toEqual([1, 2, 3, 4, 5, 6]);
  expect(closestSlot(65, [10, 40, 70])).toBe(2);
  expect(closestSlot(-100, [10, 40, 70])).toBe(0);
  expect(closestSlot(1000, [10, 40, 70])).toBe(2);
});
