import type { CSSProperties } from "react";
import { PenaltyNotice } from "./PenaltyNotice";
import { useI18n } from "../i18n/I18n";
import { CONFIG, JOKERS, PACKS } from "../game/config";
import type { Action, GameState, Joker } from "../game/types";
import { JokerArt, RarityBadge, JokerStatus } from "./Jokers";

export function Shop({
  state,
  dispatch,
  onInspect,
}: {
  state: GameState;
  dispatch: (action: Action) => void;
  onInspect?: (joker: Joker) => void;
}) {
  const { t, jokerText } = useI18n();
  const pack = state.pack;
  const opened = pack?.status === "open";
  const full = state.jokers.length >= CONFIG.slots;
  return (
    <section
      className={`shop ${opened ? "is-pack" : ""}`}
      aria-label={t("shop")}
    >
      <div className="shop-heading">
        <div>
          <h2>{opened ? t(pack.kind) : t("shop")}</h2>
          {opened && (
            <p className="pack-remaining">
              {t("packRemaining", { count: pack.remaining })}
            </p>
          )}
        </div>
        <div className="shop-purse pixel">${state.money}</div>
      </div>
      {!opened && <PenaltyNotice state={state} inline />}
      <div
        className={`shop-offers ${opened ? "pack-choices" : ""}`}
        style={
          { "--pack-count": opened ? pack.choices.length : 3 } as CSSProperties
        }
      >
        {(opened ? pack.choices : state.offers).map((offer) => {
          const definition = {
            ...JOKERS[offer.kind],
            ...jokerText(offer.kind),
          };
          const owned = state.jokers.some((joker) => joker.kind === offer.kind);
          const poor = !opened && state.money < definition.price;
          return (
            <article
              className={`shop-offer ${offer.sold ? "sold" : ""}`}
              key={offer.id}
            >
              <div className="offer-art">
                <JokerArt kind={offer.kind} />
                {!opened && (
                  <span className="price pixel">${definition.price}</span>
                )}
                {offer.sold && (
                  <span className="sold-stamp">
                    {t(opened ? "picked" : "sold")}
                  </span>
                )}
              </div>
              <div className="offer-meta">
                <h3>{definition.name}</h3>
                <RarityBadge kind={offer.kind} />
                <p className="offer-effect" style={{ color: definition.color }}>
                  {definition.effect}
                </p>
                <JokerStatus joker={offer} upcoming targetsOnly />
                <p className="offer-description">{definition.description}</p>
                <button
                  className="offer-details"
                  aria-label={t("offerDetails", { name: definition.name })}
                  onClick={() => onInspect?.(offer)}
                  disabled={!onInspect}
                >
                  {t("details")}
                </button>
              </div>
              <button
                className="button green"
                data-offer-id={offer.id}
                disabled={offer.sold || owned || poor || full}
                onClick={() =>
                  dispatch({
                    type: opened ? "choosePack" : "buy",
                    id: offer.id,
                  })
                }
                aria-label={t(opened ? "pickJoker" : "buyJoker", {
                  name: definition.name,
                })}
              >
                {offer.sold
                  ? t(opened ? "picked" : "bought")
                  : owned
                    ? t("alreadyOwned")
                    : full
                      ? t("full")
                      : poor
                        ? t("poor")
                        : opened
                          ? t("pick")
                          : t("buy", { price: definition.price })}
              </button>
            </article>
          );
        })}
        {!opened && pack && (
          <article
            className={`shop-offer pack-offer ${pack.status === "spent" ? "sold" : ""}`}
          >
            <div className="offer-art pack-art">
              <div
                className={`pack-wrapper ${pack.kind}`}
                role="img"
                aria-label={t(pack.kind)}
              />
              <span className="price pixel">${PACKS[pack.kind].price}</span>
              {pack.status === "spent" && (
                <span className="sold-stamp">{t("sold")}</span>
              )}
            </div>
            <div className="offer-meta">
              <h3>{t(pack.kind)}</h3>
              <p className="offer-effect gold">
                {t("packContents", PACKS[pack.kind])}
              </p>
              <p className="offer-description">{t("packFixed")}</p>
            </div>
            <button
              className="button gold-button"
              disabled={
                pack.status === "spent" || state.money < PACKS[pack.kind].price
              }
              onClick={() => dispatch({ type: "openPack" })}
            >
              {pack.status === "spent"
                ? t("bought")
                : state.money < PACKS[pack.kind].price
                  ? t("poor")
                  : t("openPack", { price: PACKS[pack.kind].price })}
            </button>
          </article>
        )}
      </div>
      {opened && full && (
        <p className="pack-full" role="status">
          {t("packFull")}
        </p>
      )}
      <div className="shop-actions">
        {opened ? (
          <button
            className="button neutral"
            onClick={() => dispatch({ type: "skipPack" })}
          >
            {t("skipPack")}
          </button>
        ) : (
          <>
            <button
              className="button neutral"
              disabled={state.money < state.rerollCost}
              onClick={() => dispatch({ type: "reroll" })}
            >
              ↻ {t("reroll", { price: state.rerollCost })}
            </button>
            <button
              className="button blue"
              onClick={() => dispatch({ type: "nextRound" })}
            >
              {t("nextRound")} →
            </button>
          </>
        )}
      </div>
    </section>
  );
}
