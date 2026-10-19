import { useLayoutMotion } from "./useLayoutMotion";
import type { CSSProperties } from "react";
import { useI18n } from "../i18n/I18n";
import type { Card } from "../game/types";
import { CardFace, cardColor } from "./CardFace";

interface Props {
  cards: readonly Card[];
  motionEnabled?: boolean;
  capacity: number;
  forcedId: number | null;
  debuffFaces: boolean;
  allFaces?: boolean;
  debuffedIds?: readonly number[];
  selected: readonly number[];
  disabled: boolean;
  onSelect: (id: number) => void;
  departingIds?: readonly number[];
  enteringIds?: readonly number[];
  departureKind?: "play" | "discard";
}
export function Hand({
  cards,
  motionEnabled = false,
  capacity,
  forcedId,
  debuffFaces,
  allFaces = false,
  debuffedIds = [],
  selected,
  disabled,
  onSelect,
  departingIds = [],
  enteringIds = [],
  departureKind = "play",
}: Props) {
  const container = useLayoutMotion(
    cards.map((card) => card.id).join(","),
    motionEnabled,
  );
  const { t, cardName } = useI18n();
  const isDebuffed = (card: Card) =>
    debuffedIds.includes(card.id) ||
    (debuffFaces && (allFaces || ["J", "Q", "K"].includes(card.rank)));
  return (
    <div className="hand-area">
      <div
        ref={container}
        className="hand-row"
        role="group"
        aria-label={t("hand")}
        style={{ "--count": cards.length || 8 } as CSSProperties}
      >
        {cards.map((card, index) => (
          <button
            key={card.id}
            data-motion-id={card.id}
            type="button"
            className={`playing-card ${cardColor(card)} ${forcedId === card.id ? "forced" : ""} ${isDebuffed(card) ? "debuffed" : ""} ${selected.includes(card.id) ? "selected" : ""} ${departingIds.includes(card.id) ? `card-exit-${departureKind}` : ""} ${enteringIds.includes(card.id) ? "card-enter" : ""}`}
            style={
              {
                "--card-delay": `${Math.max(0, enteringIds.indexOf(card.id)) * 32}ms`,
                "--tilt": `${(index - (cards.length - 1) / 2) * 1.35}deg`,
                "--fan": `${Math.abs(index - (cards.length - 1) / 2) * 2}px`,
              } as CSSProperties
            }
            aria-label={
              cardName(card) +
              (forcedId === card.id ? ` (${t("forcedCard")})` : "") +
              (isDebuffed(card) ? ` (${t("debuffedCard")})` : "")
            }
            aria-pressed={selected.includes(card.id)}
            disabled={disabled}
            onClick={() => onSelect(card.id)}
          >
            <CardFace card={card} />
            {forcedId === card.id && (
              <span className="card-state">{t("forcedCard")}</span>
            )}
            {isDebuffed(card) && (
              <span className="card-state debuff-label">
                {t("debuffedCard")}
              </span>
            )}
          </button>
        ))}
      </div>
      <span className="hand-caption">
        {t("handCount", { count: cards.length, capacity })}
      </span>
    </div>
  );
}
