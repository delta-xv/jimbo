import type { AnimationSpeed } from "../settings/settings";
export type MotionKind = "play" | "discard" | "deal";
export type MotionStage = "depart" | "score" | "total" | "deal";
export interface MotionFrame {
  at: number;
  stage: MotionStage;
  step: number;
}
export function motionPlan(
  kind: MotionKind,
  steps: number,
  speed: AnimationSpeed,
  reduced: boolean,
) {
  if (speed === "instant" || reduced)
    return {
      duration: 30,
      frames: [{ at: 0, stage: "deal", step: -1 } as MotionFrame],
    };
  const scale = speed === "fast" ? 0.45 : 1;
  const frames: MotionFrame[] = [
    { at: 0, stage: kind === "deal" ? "deal" : "depart", step: -1 },
  ];
  let time = 360;
  if (kind === "play") {
    for (let step = 0; step < steps; step++) {
      frames.push({ at: time, stage: "score", step });
      time += 240;
    }
    frames.push({ at: time, stage: "total", step: steps - 1 });
    time += 600;
  }
  if (kind !== "deal")
    frames.push({
      at: time,
      stage: "deal",
      step: kind === "play" ? steps - 1 : -1,
    });
  return {
    duration: Math.round((kind === "deal" ? 650 : time + 650) * scale),
    frames: frames.map((f) => ({ ...f, at: Math.round(f.at * scale) })),
  };
}
