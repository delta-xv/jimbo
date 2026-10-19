import { jokerGrowth, type JokerGrowth } from "./jokerGrowth";
import { useEffect, useRef, useState, type Dispatch } from "react";
import type { Action, Card, GameState } from "../game/types";
import type { AnimationSpeed } from "../settings/settings";
import { motionPlan, type MotionKind } from "./motion";

interface MotionEvent {
  id: number;
  kind: MotionKind;
  hand: readonly Card[];
  departingIds: readonly number[];
  incomingIds: readonly number[];
  scoreBefore: number;
  moneyBefore: number;
  steps: number;
  growth: readonly JokerGrowth[];
}
export function useGameMotion(
  speed: AnimationSpeed,
  dispatch: Dispatch<Action>,
) {
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  const [event, setEvent] = useState<MotionEvent | null>(null);
  const [frameIndex, setFrameIndex] = useState(0);
  const busy = useRef(false);
  const sequence = useRef(0);
  const enabled = speed !== "instant" && !reduced;
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useEffect(() => {
    if (!event) return;
    const plan = motionPlan(event.kind, event.steps, speed, reduced);
    const timers = plan.frames
      .slice(1)
      .map((frame, index) =>
        window.setTimeout(() => setFrameIndex(index + 1), frame.at),
      );
    timers.push(
      window.setTimeout(() => {
        if (event.kind === "play") dispatch({ type: "animationDone" });
        busy.current = false;
        setEvent(null);
      }, plan.duration),
    );
    return () => timers.forEach(clearTimeout);
  }, [event, speed, reduced, dispatch]);
  function begin(before: GameState, after: GameState, action: Action) {
    const kind: MotionKind | null =
      action.type === "play" || action.type === "discard"
        ? action.type
        : ["start", "restart", "nextRound"].includes(action.type)
          ? "deal"
          : null;
    if (!kind) return;
    busy.current = true;
    setFrameIndex(0);
    setEvent({
      id: ++sequence.current,
      kind,
      hand: before.hand,
      departingIds:
        action.type === "play" || action.type === "discard" ? action.ids : [],
      incomingIds: after.hand
        .filter((card) => !before.hand.some((old) => old.id === card.id))
        .map((card) => card.id),
      scoreBefore: before.score,
      moneyBefore: before.money,
      steps: after.lastScore?.steps.length ?? 0,
      growth: jokerGrowth(before, after, action),
    });
  }
  const plan = event
    ? motionPlan(event.kind, event.steps, speed, reduced)
    : null;
  const frame =
    plan?.frames[Math.min(frameIndex, plan.frames.length - 1)] ?? null;
  return { event, frame, enabled, busy, begin };
}
