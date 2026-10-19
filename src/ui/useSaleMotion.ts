import { useEffect, useState } from "react";
import type { Joker } from "../game/types";
export function useSaleMotion(enabled: boolean) {
  const [sale, setSale] = useState<{
    joker: Joker;
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  useEffect(() => {
    if (!sale) return;
    const timer = window.setTimeout(() => setSale(null), 400);
    return () => clearTimeout(timer);
  }, [sale]);
  function capture(joker: Joker) {
    if (!enabled) return;
    const card = document.querySelector(`[data-joker-id="${joker.id}"]`);
    if (!card) return;
    const { left, top, width, height } = card.getBoundingClientRect();
    setSale({ joker, left, top, width, height });
  }
  return { sale, capture };
}
