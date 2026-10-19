import { SUITS } from "../game/config";
import { sortByRank } from "../game/deck";
import type { GameState } from "../game/types";
import { useI18n } from "../i18n/I18n";
import { suitNames } from "../i18n/messages";
import { Modal } from "./Modal";

export function DeckInfo({
  state,
  onClose,
}: {
  state: GameState;
  onClose: () => void;
}) {
  const { t, locale, cardName } = useI18n();
  const cards = sortByRank([...state.deck, ...state.hand, ...state.used]);
  const held = new Set(state.hand.map((card) => card.id));
  const used = new Set(state.used.map((card) => card.id));
  const statusLabel = {
    draw: t("deckDraw"),
    held: t("deckHeld"),
    used: t("deckUsed"),
  };
  const symbols = { spades: "♠", hearts: "♥", diamonds: "♦", clubs: "♣" };
  return (
    <Modal title={t("deckInfo")} onClose={onClose}>
      <p className="modal-intro">{t("deckInfoHint")}</p>
      <div className="deck-summary">
        <span>
          {t("deckDraw")} <b>{state.deck.length}</b>
        </span>
        <span>
          {t("deckHeld")} <b>{state.hand.length}</b>
        </span>
        <span>
          {t("deckUsed")} <b>{state.used.length}</b>
        </span>
        <strong>{t("deckTotal", { count: cards.length })}</strong>
      </div>
      <div className="deck-overview">
        {SUITS.map((suit) => (
          <section key={suit} aria-label={suitNames[locale][suit]}>
            <h3
              className={
                suit === "hearts" || suit === "diamonds" ? "coral" : "blue"
              }
            >
              {symbols[suit]} {suitNames[locale][suit]}
            </h3>
            <div className="deck-suit-cards">
              {cards
                .filter((card) => card.suit === suit)
                .map((card) => {
                  const status = held.has(card.id)
                    ? "held"
                    : used.has(card.id)
                      ? "used"
                      : "draw";
                  return (
                    <span
                      key={card.id}
                      className={`deck-info-card ${status}`}
                      data-deck-status={status}
                      data-card-rank={card.rank}
                      data-card-suit={card.suit}
                      aria-label={`${cardName(card)} · ${statusLabel[status]}`}
                      title={`${cardName(card)} · ${statusLabel[status]}`}
                    >
                      <b className="pixel">{card.rank}</b>
                      <small>{statusLabel[status]}</small>
                    </span>
                  );
                })}
            </div>
          </section>
        ))}
      </div>
    </Modal>
  );
}
