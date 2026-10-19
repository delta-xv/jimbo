import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/I18n";
export function AnimatedNumber({
  value,
  duration = 350,
  enabled = true,
  from,
}: {
  value: number;
  duration?: number;
  enabled?: boolean;
  from?: number;
}) {
  const { number } = useI18n();
  const [display, setDisplay] = useState(enabled ? (from ?? value) : value);
  const current = useRef(enabled ? (from ?? value) : value);
  useEffect(() => {
    if (!enabled) {
      current.current = value;
      setDisplay(value);
      return;
    }
    const from = current.current;
    if (from === value) return;
    const root = document.querySelector(".game-shell");
    const scale = root
      ? Number(getComputedStyle(root).getPropertyValue("--motion-scale")) || 1
      : 1;
    const start = performance.now();
    let handle = 0;
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / (duration * scale));
      const next = Math.round(
        from + (value - from) * (1 - Math.pow(1 - progress, 3)),
      );
      current.current = next;
      setDisplay(next);
      if (progress < 1) handle = requestAnimationFrame(tick);
    };
    handle = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(handle);
  }, [value, duration, enabled]);
  return <>{number(enabled ? display : value)}</>;
}
