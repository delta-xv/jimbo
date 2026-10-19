import { expect, it } from "vitest";
import { motionPlan } from "../../../src/ui/motion";

it("TC-077: every scoring step plays once before score transfer and refill", () => {
  const plan = motionPlan("play", 7, "normal", false);
  expect(plan.frames[0].stage).toBe("depart");
  expect(
    plan.frames.filter((f) => f.stage === "score").map((f) => f.step),
  ).toEqual([0, 1, 2, 3, 4, 5, 6]);
  expect(plan.frames.slice(-2).map((f) => f.stage)).toEqual(["total", "deal"]);
  expect(
    plan.frames.every(
      (frame, i) => i === 0 || frame.at > plan.frames[i - 1].at,
    ),
  ).toBe(true);
  expect(plan.duration).toBeGreaterThan(plan.frames.at(-1)!.at);
});
it("TC-078: discard leaves before refill; fast and accessible modes shorten the whole sequence", () => {
  const normal = motionPlan("discard", 0, "normal", false);
  expect(normal.frames.map((f) => f.stage)).toEqual(["depart", "deal"]);
  expect(motionPlan("discard", 0, "fast", false).duration).toBeLessThan(
    normal.duration,
  );
  for (const kind of ["play", "discard", "deal"] as const) {
    expect(motionPlan(kind, 10, "instant", false)).toMatchObject({
      duration: 30,
      frames: [{ at: 0, stage: "deal", step: -1 }],
    });
    expect(motionPlan(kind, 10, "normal", true).duration).toBe(30);
  }
});
