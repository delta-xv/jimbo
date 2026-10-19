import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type PointerEvent,
  type MouseEvent,
  type KeyboardEvent,
} from "react";
import { closestSlot, insertJoker } from "./jokerDrag";

type Preview = {
  id: number;
  ids: readonly number[];
  x: number;
  y: number;
  width: number;
  height: number;
};
type Gesture = {
  pointer: number;
  id: number;
  ids: readonly number[];
  centers: number[];
  row: DOMRect;
  rect: DOMRect;
  x: number;
  y: number;
  offsetX: number;
  offsetY: number;
  active: boolean;
  target: HTMLElement;
};
export function useJokerDrag(
  ids: readonly number[],
  disabled: boolean,
  commit: (ids: readonly number[]) => void,
) {
  const pending = useRef<Gesture | null>(null);
  const suppressClick = useRef(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const signature = ids.join(",");
  const cancel = useCallback(() => {
    const gesture = pending.current;
    pending.current = null;
    if (gesture?.active) suppressClick.current = true;
    if (gesture?.target.hasPointerCapture(gesture.pointer))
      gesture.target.releasePointerCapture(gesture.pointer);
    setPreview(null);
  }, []);
  useEffect(() => {
    cancel();
  }, [disabled, signature, cancel]);
  useEffect(() => {
    const hide = () => {
      if (document.hidden) cancel();
    };
    window.addEventListener("blur", cancel);
    window.addEventListener("resize", cancel);
    document.addEventListener("visibilitychange", hide);
    return () => {
      window.removeEventListener("blur", cancel);
      window.removeEventListener("resize", cancel);
      document.removeEventListener("visibilitychange", hide);
    };
  }, [cancel]);
  function down(event: PointerEvent<HTMLButtonElement>, id: number) {
    if (
      disabled ||
      pending.current ||
      event.button !== 0 ||
      !event.isPrimary ||
      ids.length < 2
    )
      return;
    suppressClick.current = false;
    const target = event.currentTarget;
    const rack = target.parentElement!;
    const rect = target.getBoundingClientRect();
    const centers = Array.from(
      rack.querySelectorAll<HTMLButtonElement>("[data-joker-id]"),
    ).map((button) => {
      const r = button.getBoundingClientRect();
      return r.left + r.width / 2;
    });
    pending.current = {
      pointer: event.pointerId,
      id,
      ids,
      centers,
      row: rack.getBoundingClientRect(),
      rect,
      x: event.clientX,
      y: event.clientY,
      offsetX: event.clientX - rect.left,
      offsetY: event.clientY - rect.top,
      active: false,
      target,
    };
    target.setPointerCapture(event.pointerId);
  }
  function move(event: PointerEvent<HTMLDivElement>) {
    const gesture = pending.current;
    if (!gesture || gesture.pointer !== event.pointerId || disabled) return;
    if (
      !gesture.active &&
      Math.hypot(event.clientX - gesture.x, event.clientY - gesture.y) < 7
    )
      return;
    if (!gesture.active) {
      const rack = gesture.target.parentElement!;
      gesture.target = rack;
      rack.setPointerCapture(gesture.pointer);
    }
    gesture.active = true;
    event.preventDefault();
    const x = event.clientX - gesture.offsetX;
    setPreview({
      id: gesture.id,
      ids: insertJoker(
        gesture.ids,
        gesture.id,
        closestSlot(x + gesture.rect.width / 2, gesture.centers),
      ),
      x,
      y: event.clientY - gesture.offsetY,
      width: gesture.rect.width,
      height: gesture.rect.height,
    });
  }
  function up(event: PointerEvent<HTMLDivElement>) {
    const gesture = pending.current;
    if (!gesture || gesture.pointer !== event.pointerId) return;
    const inside =
      event.clientX >= gesture.row.left - 24 &&
      event.clientX <= gesture.row.right + 24 &&
      event.clientY >= gesture.row.top - 32 &&
      event.clientY <= gesture.row.bottom + 32;
    const next = insertJoker(
      gesture.ids,
      gesture.id,
      closestSlot(
        event.clientX - gesture.offsetX + gesture.rect.width / 2,
        gesture.centers,
      ),
    );
    cancel();
    if (
      gesture.active &&
      inside &&
      !disabled &&
      next !== gesture.ids &&
      gesture.ids.join(",") === signature
    )
      commit(next);
  }
  function canceled(event: PointerEvent<HTMLDivElement>) {
    if (
      event.type === "lostpointercapture" &&
      event.target !== pending.current?.target
    )
      return;
    if (pending.current?.pointer === event.pointerId) cancel();
  }
  function click(event: MouseEvent<HTMLDivElement>) {
    if (!suppressClick.current) return;
    suppressClick.current = false;
    event.preventDefault();
    event.stopPropagation();
  }
  function key(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && pending.current) {
      event.preventDefault();
      event.stopPropagation();
      cancel();
    } else suppressClick.current = false;
  }
  return {
    preview:
      !disabled && pending.current?.ids.join(",") === signature
        ? preview
        : null,
    down,
    move,
    up,
    canceled,
    click,
    key,
  };
}
