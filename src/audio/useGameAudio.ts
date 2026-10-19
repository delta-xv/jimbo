import { useCallback, useEffect, useRef } from "react";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import type { AudioSettings } from "../settings/settings";
import type { GameState, ScoreStep } from "../game/types";
import type { MotionFrame } from "../ui/motion";
import { AudioPlayer, type Sound } from "./AudioPlayer";

export function scoreSound(step: ScoreStep): Sound {
  if (step.kind === "joker")
    return step.operation === "multiply"
      ? "multiply"
      : step.operation === "mult"
        ? "mult"
        : step.operation === "retrigger"
          ? "pop"
          : "chips";
  return step.kind === "hand"
    ? "button"
    : step.kind === "debuff"
      ? "card_deselect"
      : "chips";
}
export function useGameAudio(
  options: AudioSettings,
  state: GameState,
  frame: MotionFrame | null,
  eventId: number | undefined,
) {
  const musicRef = useRef<HTMLAudioElement>(null);
  const player = useRef<AudioPlayer | null>(null);
  useEffect(() => {
    const audio = new AudioPlayer(musicRef.current!);
    player.current = audio;
    let nativeActive = true;
    const visibility = () => audio.setActive(!document.hidden && nativeActive);
    document.addEventListener("visibilitychange", visibility);
    visibility();
    const listener = Capacitor.isNativePlatform()
      ? NativeApp.addListener("appStateChange", ({ isActive }) => {
          nativeActive = isActive;
          visibility();
        })
      : null;
    return () => {
      document.removeEventListener("visibilitychange", visibility);
      void listener?.then((handle) => handle.remove());
      audio.dispose();
      player.current = null;
    };
  }, []);
  useEffect(() => {
    player.current?.configure(options);
  }, [options]);
  const unlock = useCallback(() => player.current?.unlock(), []);
  const configure = useCallback(
    (value: AudioSettings) => player.current?.configure(value),
    [],
  );
  const play = useCallback((sound: Sound, rate?: number) => {
    void player.current?.play(sound, rate);
  }, []);
  const cueKey = useRef("");
  useEffect(() => {
    if (!frame || eventId === undefined) return;
    const key = `${eventId}:${frame.stage}:${frame.step}`;
    if (cueKey.current === key) return;
    cueKey.current = key;
    if (frame.stage === "score") {
      const step = state.lastScore?.steps[frame.step];
      if (step) play(scoreSound(step), 1 + Math.min(frame.step, 12) * 0.025);
    } else if (frame.stage === "total") play("total");
    else if (frame.stage === "deal") play("draw");
  }, [frame, eventId, state.lastScore, play]);
  const phase = state.locked ? "scoring" : state.phase;
  const previousPhase = useRef(phase);
  useEffect(() => {
    if (phase !== previousPhase.current) {
      if (phase === "lost") play("lose");
      else if (phase === "won") play("win");
      else if (phase === "roundWon") play("mult");
    }
    previousPhase.current = phase;
  }, [phase, play]);
  return { musicRef, unlock, play, configure };
}
