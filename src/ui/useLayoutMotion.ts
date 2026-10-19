import { useLayoutEffect, useRef } from "react";
export function useLayoutMotion(order: string, enabled: boolean) {
  const container = useRef<HTMLDivElement>(null);
  const previous = useRef(new Map<string, { left: number; top: number }>());
  useLayoutEffect(() => {
    const positions = new Map<string, { left: number; top: number }>();
    const animations: Animation[] = [];
    container.current
      ?.querySelectorAll<HTMLElement>("[data-motion-id]")
      .forEach((element) => {
        const id = element.dataset.motionId!;
        const position = { left: element.offsetLeft, top: element.offsetTop };
        const old = previous.current.get(id);
        positions.set(id, position);
        if (
          enabled &&
          old &&
          (old.left !== position.left || old.top !== position.top)
        ) {
          const style = getComputedStyle(element);
          const transform = style.transform;
          const scale = Number(style.getPropertyValue("--motion-scale")) || 1;
          animations.push(
            element.animate(
              [
                {
                  transform: `translate(${old.left - position.left}px, ${old.top - position.top}px) ${transform === "none" ? "" : transform}`,
                },
                { transform },
              ],
              { duration: 220 * scale, easing: "cubic-bezier(.2,.8,.25,1)" },
            ),
          );
        }
      });
    previous.current = positions;
    return () => animations.forEach((animation) => animation.cancel());
  }, [order, enabled]);
  return container;
}
