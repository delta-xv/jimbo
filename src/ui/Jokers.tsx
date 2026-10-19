import { GROWTH_FRAMES, type JokerGrowth } from "./jokerGrowth";
import { createPortal } from "react-dom";
import { useJokerDrag } from "./useJokerDrag";
import { useLayoutMotion } from "./useLayoutMotion";
import { useI18n } from "../i18n/I18n";
import { useEffect, type CSSProperties } from "react";
import { CONFIG, JOKERS, SUIT_SYMBOLS } from "../game/config";
import { suitNames } from "../i18n/messages";
import type { Joker, JokerId } from "../game/types";

export function JokerArt({ kind }: { kind: JokerId }) {
  const { t, jokerText } = useI18n();
  const art = JOKERS[kind].art;
  const extra = art - 5;
  return (
    <div
      className="joker-art"
      role="img"
      aria-label={t("jokerArt", { name: jokerText(kind).name })}
      style={
        art < 5
          ? { backgroundPosition: `${art * 25}% center` }
          : {
              backgroundImage: "url(/art/dave-jokers-expanded.png)",
              backgroundSize: "700% 400%",
              backgroundPosition: `${((extra % 7) * 100) / 6}% ${(Math.floor(extra / 7) * 100) / 3}%`,
            }
      }
    />
  );
}

export function JokerRow({
  jokers,
  disabled,
  onSelect,
  onReorder,
  activeId = null,
  disabledId = null,
  motionEnabled = false,
  upcoming = false,
  growth,
  growthKey,
}: {
  jokers: readonly Joker[];
  disabled: boolean;
  onSelect: (id: number) => void;
  onReorder: (ids: readonly number[]) => void;
  growth?: readonly JokerGrowth[];
  growthKey?: number;
  activeId?: number | null;
  disabledId?: number | null;
  motionEnabled?: boolean;
  upcoming?: boolean;
}) {
  const { t, jokerText, locale } = useI18n();
  const drag = useJokerDrag(
    jokers.map((joker) => joker.id),
    disabled,
    onReorder,
  );
  const ordered = drag.preview
    ? drag.preview.ids.map((id) => jokers.find((joker) => joker.id === id)!)
    : jokers;
  const dragged = jokers.find((joker) => joker.id === drag.preview?.id);
  const container = useLayoutMotion(
    ordered.map((joker) => joker.id).join(","),
    motionEnabled,
  );
  useEffect(() => {
    if (!motionEnabled || !growth?.length || !container.current) return;
    const scale =
      Number(
        getComputedStyle(container.current).getPropertyValue("--motion-scale"),
      ) || 1;
    const animations: Animation[] = [];
    for (const change of growth) {
      const art = container.current.querySelector<HTMLElement>(
        `[data-joker-id="${change.id}"] > .joker-art`,
      );
      if (!art) continue;
      const animation = art.animate(GROWTH_FRAMES[change.direction], {
        duration: (change.direction === "gain" ? 540 : 440) * scale,
        easing: "ease-out",
      });
      animation.id = `joker-growth-${change.direction}-${growthKey}`;
      animations.push(animation);
      const button = art.parentElement!;
      const resting = getComputedStyle(button);
      const emphasis = button.animate(
        [
          { offset: 0, opacity: resting.opacity, filter: resting.filter },
          { offset: 0.18, opacity: 1, filter: "none" },
          { offset: 0.62, opacity: 1, filter: "none" },
          { offset: 1, opacity: resting.opacity, filter: resting.filter },
        ],
        {
          duration: (change.direction === "gain" ? 540 : 440) * scale,
          easing: "ease-out",
        },
      );
      emphasis.id = `joker-growth-emphasis-${growthKey}`;
      animations.push(emphasis);
    }
    return () => animations.forEach((animation) => animation.cancel());
  }, [growth, growthKey, motionEnabled, container]);
  return (
    <section className="joker-rack" aria-label={t("ownedJokers")}>
      <div className="section-label">
        <h2>
          {t("jokers")}{" "}
          <span className="pixel">
            {jokers.length} / {CONFIG.slots}
          </span>
        </h2>
      </div>
      <div
        ref={container}
        className={`joker-slots ${drag.preview ? "is-dragging" : ""}`}
        onPointerMove={drag.move}
        onPointerUp={drag.up}
        onPointerCancel={drag.canceled}
        onLostPointerCapture={drag.canceled}
        onClickCapture={drag.click}
        onKeyDownCapture={drag.key}
      >
        {ordered.map((joker) => {
          const change = motionEnabled
            ? growth?.find((item) => item.id === joker.id)
            : undefined;
          return (
            <button
              key={joker.id}
              data-joker-id={joker.id}
              data-growth={change?.direction}
              data-motion-id={joker.id}
              className={`joker-card ${drag.preview?.id === joker.id ? "drag-source" : ""} ${activeId === joker.id ? "joker-trigger" : ""} ${disabledId === joker.id ? "joker-debuffed" : ""}`}
              disabled={disabled}
              aria-label={t("viewJoker", { name: jokerText(joker.kind).name })}
              title={`${jokerText(joker.kind).name} · ${disabledId === joker.id ? t("jokerDisabled") : jokerText(joker.kind).effect}`}
              style={
                { "--joker-color": JOKERS[joker.kind].color } as CSSProperties
              }
              onPointerDown={(event) => drag.down(event, joker.id)}
              onDragStart={(event) => event.preventDefault()}
              onClick={() => onSelect(joker.id)}
            >
              <JokerArt kind={joker.kind} />
              {joker.targetSuit && (
                <span
                  className="target-suit-badge"
                  aria-label={t(upcoming ? "nextTargetSuit" : "targetSuit", {
                    suit: suitNames[locale][joker.targetSuit],
                  })}
                >
                  {SUIT_SYMBOLS[joker.targetSuit]}
                </span>
              )}
              <span className="joker-name">{jokerText(joker.kind).name}</span>
              <RarityBadge kind={joker.kind} compact />
              {disabledId === joker.id && (
                <span className="joker-disabled-label">
                  {t("jokerDisabled")}
                </span>
              )}
              <span className="joker-effect">
                {jokerText(joker.kind).effect}
              </span>
            </button>
          );
        })}
        {Array.from({ length: CONFIG.slots - jokers.length }, (_, index) => (
          <div key={`empty-${index}`} className="joker-slot">
            <span>♧</span>
            <small className="pixel">JOKER</small>
          </div>
        ))}
      </div>
      {drag.preview &&
        dragged &&
        createPortal(
          <div
            className="joker-drag-ghost"
            aria-hidden="true"
            style={{
              left: drag.preview.x,
              top: drag.preview.y,
              width: drag.preview.width,
              height: drag.preview.height,
            }}
          >
            <JokerArt kind={dragged.kind} />
          </div>,
          document.body,
        )}
    </section>
  );
}

export function RarityBadge({
  kind,
  compact = false,
}: {
  kind: JokerId;
  compact?: boolean;
}) {
  const { t } = useI18n();
  const rarity = JOKERS[kind].rarity;
  return (
    <span
      className={`rarity-badge rarity-${rarity} ${compact ? "compact" : ""}`}
    >
      {t(
        rarity === "common"
          ? "rarityCommon"
          : rarity === "uncommon"
            ? "rarityUncommon"
            : "rarityRare",
      )}
    </span>
  );
}
export function JokerStatus({
  joker,
  upcoming = false,
  targetsOnly = false,
}: {
  joker: Joker;
  upcoming?: boolean;
  targetsOnly?: boolean;
}) {
  const { t, locale } = useI18n();
  return (
    <>
      {!targetsOnly &&
        ["green_joker", "square_joker", "castle"].includes(joker.kind) && (
          <p className="joker-status">
            {t("currentBonus", { value: joker.value ?? 0 })}
          </p>
        )}
      {["ancient_joker", "castle"].includes(joker.kind) && (
        <p className="joker-status">
          {joker.targetSuit
            ? t(upcoming ? "nextTargetSuit" : "targetSuit", {
                suit: suitNames[locale][joker.targetSuit],
              })
            : t("nextRoundSuit")}
        </p>
      )}
    </>
  );
}
