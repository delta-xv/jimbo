import { HandInfo } from "./ui/HandInfo";
import { Tutorial } from "./ui/Tutorial";
import { hasSeenTutorial, markTutorialSeen } from "./tutorial/practice";
import { RunOutcome } from "./ui/RunOutcome";
import { useGameAudio } from "./audio/useGameAudio";
import { App as NativeApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { listenForNativeEvents } from "./native/lifecycle";
import { flushStorage, onStorageError } from "./storage/storage";
import { loadRun, parseRun, saveRun, serializeRun } from "./save/run";
import { activeJokers, disabledJoker } from "./game/jokerActivity";
import { PenaltyIntro } from "./ui/PenaltyIntro";
import { enteringPenalty, type PenaltyEntry } from "./ui/penaltyPresentation";
import { PenaltyNotice } from "./ui/PenaltyNotice";
import { activePenalty } from "./game/progression";
import { handLimit, playProblem } from "./game/penalty";
import { SettingsDialog } from "./ui/SettingsDialog";
import { loadSettings, saveSettings } from "./settings/settings";
import {
  useEffect,
  useCallback,
  useReducer,
  useRef,
  useState,
  type CSSProperties,
} from "react";
import { HANDS, JOKERS, SUITS } from "./game/config";
import { createGame, gameReducer } from "./game/reducer";
import { sortByRank } from "./game/deck";
import { blueprintCompatible, evaluateHand, rankValue } from "./game/score";
import { useI18n } from "./i18n/I18n";
import type { Action, Joker } from "./game/types";
import { useSaleMotion } from "./ui/useSaleMotion";
import { useGameMotion } from "./ui/useGameMotion";
import { Hand } from "./ui/Hand";
import { JokerArt, JokerRow, RarityBadge, JokerStatus } from "./ui/Jokers";
import { DeckInfo } from "./ui/DeckInfo";
import { Modal } from "./ui/Modal";
import { Shop } from "./ui/Shop";
import { Sidebar } from "./ui/Sidebar";
import { TableCenter } from "./ui/TableCenter";

function initialSeed(): number {
  const value = new URLSearchParams(location.search).get("seed");
  return value !== null && /^\d+$/.test(value)
    ? Number(value) >>> 0
    : crypto.getRandomValues(new Uint32Array(1))[0];
}

export default function App() {
  const { t, handName, jokerText, formatStep, number, setLocale } = useI18n();
  const [loadedRun] = useState(loadRun);
  const [savedRun, setSavedRun] = useState(loadedRun.state);
  const [saveNotice, setSaveNotice] = useState(loadedRun.status);
  const [settings, setSettings] = useState(loadSettings);
  const [tutorialSeen, setTutorialSeen] = useState(hasSeenTutorial);
  const [state, dispatch] = useReducer(gameReducer, undefined, () =>
    createGame(initialSeed(), settings.rules),
  );
  const stateRef = useRef(state);
  stateRef.current = state;
  const [penaltyIntro, setPenaltyIntro] = useState<PenaltyEntry | null>(null);
  const dismissPenaltyIntro = useCallback(() => setPenaltyIntro(null), []);
  const [selection, setSelected] = useState<number[]>([]);
  const [modal, setModal] = useState<
    | "rules"
    | "trace"
    | "restart"
    | "settings"
    | "deck"
    | "newRun"
    | "tutorial"
    | null
  >(null);
  const [offerDetail, setOfferDetail] = useState<Joker | null>(null);
  const [jokerId, setJokerId] = useState<number | null>(null);
  const motion = useGameMotion(settings.animation, dispatch);
  const audio = useGameAudio(
    settings.audio,
    state,
    motion.frame,
    motion.event?.id,
  );
  const saleMotion = useSaleMotion(motion.enabled);
  const stepIndex = motion.frame?.step ?? -1;
  const motionStage = motion.frame?.stage;
  const scoreTransfer = motionStage === "total" || motionStage === "deal";
  const outcome =
    !state.locked &&
    !motion.event &&
    (state.phase === "won" || state.phase === "lost")
      ? state.phase
      : null;
  const outcomeBack = useRef(() => {});
  const busy = state.locked || motion.event !== null || penaltyIntro !== null;
  const [notice, setNotice] = useState<
    "selectLimit" | "forcedCardRequired" | null
  >(null);
  const forcedId = state.phase === "playing" ? state.forcedCardId : null;
  const selected =
    forcedId === null
      ? selection
      : [forcedId, ...selection.filter((id) => id !== forcedId)].slice(0, 5);
  const canPlay = state.phase === "playing" && !busy;
  const chosen = state.hand.filter((card) => selected.includes(card.id));
  const selectedHand =
    chosen.length > 0 && canPlay
      ? evaluateHand(chosen, activeJokers(state)).hand
      : null;
  const preview = selectedHand
    ? { hand: selectedHand, ...HANDS[selectedHand] }
    : null;
  const step = state.locked
    ? (state.lastScore?.steps[stepIndex] ?? null)
    : null;
  const problem = chosen.length ? playProblem(state, chosen) : null;
  const ownedInspection = state.jokers.find((joker) => joker.id === jokerId);
  const inspected = ownedInspection ?? offerDetail;
  const copyTarget =
    inspected?.kind === "blueprint"
      ? state.jokers[
          state.jokers.findIndex((joker) => joker.id === inspected.id) + 1
        ]
      : undefined;
  const visualHand =
    !motion.enabled || !motion.event
      ? state.hand
      : motionStage === "depart"
        ? motion.event.hand
        : motion.event.kind === "play" && motionStage !== "deal"
          ? state.hand.filter(
              (card) => !motion.event!.incomingIds.includes(card.id),
            )
          : state.hand;

  useEffect(() => {
    document.documentElement.dataset.crt = settings.crt ? "on" : "off";
  }, [settings.crt]);

  useEffect(() => {
    if (state.phase !== "ready" && !saveRun(state))
      setSaveNotice("unavailable");
  }, [state]);
  useEffect(() => onStorageError(() => setSaveNotice("unavailable")), []);
  useEffect(() => {
    if (outcome) {
      setModal(null);
      setJokerId(null);
      setOfferDetail(null);
    }
  }, [outcome]);
  const back = useRef(() => {});
  back.current = () => {
    if (outcome) outcomeBack.current();
    else if (penaltyIntro !== null) dismissPenaltyIntro();
    else if (offerDetail !== null) setOfferDetail(null);
    else if (jokerId !== null) setJokerId(null);
    else if (modal !== null) {
      if (modal === "settings") audio.configure(settings.audio);
      setModal(null);
    } else if (busy) return;
    else if (state.phase !== "ready") setModal("restart");
    else if (Capacitor.getPlatform() === "android")
      void NativeApp.minimizeApp().catch(() => {});
  };
  useEffect(() => {
    return listenForNativeEvents({
      back: () => back.current(),
      stateChange: (active) => {
        if (!active) {
          if (!saveRun(stateRef.current)) setSaveNotice("unavailable");
          void flushStorage().then((saved) => {
            if (!saved) setSaveNotice("unavailable");
          });
        }
      },
    });
  }, []);
  function send(action: Action) {
    if (motion.busy.current || penaltyIntro !== null) return;
    const next = gameReducer(state, action);
    if (next === state) return;
    if (action.type === "menu") {
      if (!saveRun(state)) setSaveNotice("unavailable");
      setSavedRun(parseRun(serializeRun(state)).state);
    } else if (action.type !== "configure") {
      const saved = saveRun(next);
      setSaveNotice(saved ? "ok" : "unavailable");
      if (
        action.type === "start" ||
        action.type === "resume" ||
        action.type === "restart"
      )
        setSavedRun(null);
    }
    if (action.type === "play") audio.play("pop");
    else if (action.type === "discard") audio.play("discard");
    else if (["buy", "sell", "choosePack"].includes(action.type))
      audio.play("mult");
    else if (["openPack", "reroll"].includes(action.type)) audio.play("draw");
    else if (["reorderHand", "reorderJokers"].includes(action.type))
      audio.play("card_deselect");
    const entry = enteringPenalty(state, next);
    if (entry) setPenaltyIntro(entry);
    stateRef.current = next;
    motion.begin(state, next, action);
    if (action.type === "sell") {
      const joker = state.jokers.find((item) => item.id === action.id);
      if (joker) saleMotion.capture(joker);
    }
    if (
      [
        "play",
        "discard",
        "start",
        "resume",
        "restart",
        "nextRound",
        "menu",
      ].includes(action.type)
    ) {
      setSelected([]);
      setNotice(null);
    }
    dispatch(action);
  }
  function select(id: number) {
    if (!canPlay) return;
    if (id === forcedId) {
      setNotice("forcedCardRequired");
      return;
    }
    if (selected.includes(id)) {
      audio.play("card_deselect");
      setSelected(selected.filter((value) => value !== id));
      setNotice(null);
    } else if (selected.length < 5) {
      audio.play("card_select");
      setSelected([...selected, id]);
      setNotice(null);
    } else setNotice("selectLimit");
  }
  function sortHand(mode: "rank" | "suit") {
    const cards =
      mode === "rank"
        ? sortByRank(state.hand)
        : [...state.hand].sort(
            (a, b) =>
              SUITS.indexOf(a.suit) - SUITS.indexOf(b.suit) ||
              rankValue(b.rank) - rankValue(a.rank),
          );
    send({ type: "reorderHand", ids: cards.map((card) => card.id) });
  }
  function moveJoker(direction: number) {
    if (!inspected) return;
    const ids = state.jokers.map((joker) => joker.id);
    const from = ids.indexOf(inspected.id);
    const to = from + direction;
    if (to < 0 || to >= ids.length) return;
    [ids[from], ids[to]] = [ids[to], ids[from]];
    send({ type: "reorderJokers", ids });
  }
  return (
    <main
      className={`game-shell ${outcome ? "is-outcome" : ""}`}
      onPointerDownCapture={audio.unlock}
      onClickCapture={audio.unlock}
      onKeyDownCapture={audio.unlock}
      onClick={(event) => {
        const button = (event.target as Element).closest("button");
        if (
          button &&
          !button.disabled &&
          !button.closest(".hand-row,.controls,.shop,.joker-inspector")
        )
          audio.play("button");
      }}
      data-phase={state.phase}
      data-motion={motion.enabled ? settings.animation : "instant"}
      data-motion-stage={motionStage ?? "idle"}
      data-penalty-intro={penaltyIntro ? "active" : "idle"}
      onContextMenu={(event) => {
        if (
          !(event.target as HTMLElement).closest(
            'input, textarea, [contenteditable="true"]',
          )
        )
          event.preventDefault();
      }}
      style={
        {
          "--motion-scale": settings.animation === "fast" ? 0.45 : 1,
        } as CSSProperties
      }
    >
      <audio
        ref={audio.musicRef}
        data-audio="music"
        loop
        preload="none"
        hidden
      >
        <source src="/audio/theme.m4a" type="audio/mp4" />
        <source src="/audio/theme.ogg" type={'audio/ogg; codecs="opus"'} />
      </audio>
      {outcome ? (
        <RunOutcome
          key={`${state.seed}-${outcome}`}
          outcome={outcome}
          enabled={motion.enabled}
          scale={settings.animation === "fast" ? 0.45 : 1}
          backRef={outcomeBack}
          onAgain={() =>
            send({
              type: "restart",
              seed: crypto.getRandomValues(new Uint32Array(1))[0],
            })
          }
          onMenu={() =>
            send({
              type: "menu",
              seed: crypto.getRandomValues(new Uint32Array(1))[0],
            })
          }
        />
      ) : (
        <>
          <Sidebar
            state={state}
            preview={preview}
            step={step}
            motionEnabled={motion.enabled}
            pulseKey={
              state.locked ? `${motion.event?.id}-${stepIndex}` : "idle"
            }
            scoreValue={
              motion.event?.kind === "play" && !scoreTransfer
                ? motion.event.scoreBefore
                : state.score
            }
            moneyValue={
              state.locked && motion.event
                ? motion.event.moneyBefore
                : state.money
            }
            onRules={() => setModal("rules")}
            onRestart={() => {
              if (!motion.busy.current) setModal("restart");
            }}
            onTrace={() => setModal("trace")}
          />
          <div
            className={`board ${state.phase === "shop" ? "in-shop" : ""} ${!state.locked && ["roundWon", "won", "lost"].includes(state.phase) ? "terminal" : ""}`}
          >
            <JokerRow
              jokers={state.jokers}
              upcoming={state.phase === "shop"}
              growth={motion.event?.growth}
              growthKey={motion.event?.id}
              disabledId={disabledJoker(state)}
              motionEnabled={motion.enabled}
              disabled={busy || !["playing", "shop"].includes(state.phase)}
              activeId={
                motionStage === "score" && step?.kind === "joker"
                  ? step.instanceId
                  : null
              }
              onSelect={setJokerId}
              onReorder={(ids) => send({ type: "reorderJokers", ids })}
            />
            {state.phase === "shop" ? (
              <Shop state={state} dispatch={send} onInspect={setOfferDetail} />
            ) : (
              <>
                <div className="table-zone">
                  <PenaltyNotice key={state.round} state={state} />
                  <TableCenter
                    state={state}
                    preview={preview}
                    step={step}
                    motionStage={motionStage}
                    pulseKey={`${motion.event?.id}-${stepIndex}`}
                    motionEnabled={motion.enabled}
                    dispatch={send}
                    onSettings={() => setModal("settings")}
                    tutorialNew={!tutorialSeen}
                    onTutorial={() => {
                      markTutorialSeen();
                      setTutorialSeen(true);
                      setModal("tutorial");
                    }}
                    savedRound={savedRun?.round}
                    onContinue={
                      savedRun
                        ? () => send({ type: "resume", state: savedRun })
                        : undefined
                    }
                    onStart={() =>
                      savedRun ? setModal("newRun") : send({ type: "start" })
                    }
                  />
                  {state.phase !== "ready" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setModal("deck")}
                      className={`draw-pile ${motionStage === "deal" ? "is-dealing" : ""}`}
                      aria-label={t("deckOpen", { count: state.deck.length })}
                    >
                      <span className="card-back">
                        <span>♠</span>
                      </span>
                      <span>{t("deckInfo")}</span>
                      <strong className="pixel">
                        {state.deck.length} <small>{t("cardUnit")}</small>
                      </strong>
                    </button>
                  )}
                </div>
                <Hand
                  cards={visualHand}
                  departingIds={
                    motionStage === "depart"
                      ? motion.event?.departingIds
                      : undefined
                  }
                  departureKind={
                    motion.event?.kind === "discard" ? "discard" : "play"
                  }
                  enteringIds={
                    motionStage === "deal"
                      ? motion.event?.incomingIds
                      : undefined
                  }
                  motionEnabled={motion.enabled}
                  capacity={handLimit(state)}
                  forcedId={forcedId}
                  debuffFaces={activePenalty(state) === "face_debuff"}
                  debuffedIds={
                    activePenalty(state) === "played_cards_debuff"
                      ? visualHand
                          .filter((card) =>
                            state.stagePlayedCards.includes(
                              `${card.suit}:${card.rank}`,
                            ),
                          )
                          .map((card) => card.id)
                      : []
                  }
                  allFaces={activeJokers(state).some(
                    (joker) => joker.kind === "pareidolia",
                  )}
                  selected={selected}
                  disabled={!canPlay}
                  onSelect={select}
                />
                <div className="controls-area">
                  <div className="controls">
                    <button
                      className="button blue play-button"
                      disabled={
                        !canPlay || selected.length === 0 || problem !== null
                      }
                      onClick={() => send({ type: "play", ids: selected })}
                    >
                      {t("play")}{" "}
                      <span className="pixel">{selected.length || ""}</span>
                    </button>
                    <button
                      className="button coral"
                      disabled={
                        !canPlay ||
                        selected.length === 0 ||
                        state.discards === 0
                      }
                      onClick={() => send({ type: "discard", ids: selected })}
                    >
                      {t("discard")}
                    </button>
                    <button
                      className="button neutral clear-selection"
                      disabled={
                        !canPlay || !selected.some((id) => id !== forcedId)
                      }
                      onClick={() => {
                        audio.play("card_deselect");
                        setSelected([]);
                        setNotice(null);
                      }}
                    >
                      {t("clearSelection")}
                    </button>
                    <div className="sort-controls">
                      <button
                        disabled={!canPlay}
                        onClick={() => sortHand("rank")}
                      >
                        {t("byRank")}
                      </button>
                      <button
                        disabled={!canPlay}
                        onClick={() => sortHand("suit")}
                      >
                        {t("bySuit")}
                      </button>
                    </div>
                  </div>
                  <p className="notice" role="status">
                    {problem
                      ? t(problem, {
                          hand: state.playedHandTypes[0]
                            ? handName(state.playedHandTypes[0])
                            : "",
                        })
                      : notice
                        ? t(notice)
                        : state.locked
                          ? t("settling")
                          : selected.length
                            ? t("selectedCount", { count: selected.length })
                            : ""}
                  </p>
                </div>
              </>
            )}
          </div>
          {(["invalid", "unsupported", "unavailable"] as string[]).includes(
            saveNotice,
          ) && (
            <p className="save-warning" role="status">
              {t(
                saveNotice === "unsupported"
                  ? "saveUnsupported"
                  : saveNotice === "unavailable"
                    ? "saveUnavailable"
                    : "saveInvalid",
              )}
            </p>
          )}
          {penaltyIntro && (
            <PenaltyIntro
              entry={penaltyIntro}
              onDismiss={dismissPenaltyIntro}
            />
          )}
          {modal === "newRun" && (
            <Modal title={t("newRunTitle")} onClose={() => setModal(null)}>
              <p className="modal-intro">{t("newRunBody")}</p>
              <div className="modal-actions">
                <button
                  className="button neutral"
                  onClick={() => setModal(null)}
                >
                  {t("cancel")}
                </button>
                <button
                  className="button coral"
                  onClick={() => {
                    setModal(null);
                    send({ type: "start" });
                  }}
                >
                  {t("newRun")}
                </button>
              </div>
            </Modal>
          )}
          {saleMotion.sale && motion.enabled && (
            <div
              key={saleMotion.sale.joker.id}
              className="sale-ghost"
              aria-hidden="true"
              style={{
                left: saleMotion.sale.left,
                top: saleMotion.sale.top,
                width: saleMotion.sale.width,
                height: saleMotion.sale.height,
              }}
            >
              <JokerArt kind={saleMotion.sale.joker.kind} />
              <span className="pixel">
                +${JOKERS[saleMotion.sale.joker.kind].sell}
              </span>
            </div>
          )}
          {modal === "settings" && state.phase === "ready" && (
            <SettingsDialog
              settings={settings}
              onAudioPreview={audio.configure}
              onClose={() => {
                audio.configure(settings.audio);
                setModal(null);
              }}
              onSave={(next, locale) => {
                setSettings(next);
                saveSettings(next);
                setLocale(locale);
                send({ type: "configure", rules: next.rules });
                setModal(null);
              }}
            />
          )}
          {modal === "deck" && (
            <DeckInfo state={state} onClose={() => setModal(null)} />
          )}
          {modal === "tutorial" && state.phase === "ready" && (
            <Tutorial
              hasSavedRun={savedRun !== null}
              animated={motion.enabled}
              onClose={() => setModal(null)}
              onFinish={() => {
                setModal(null);
                if (savedRun) send({ type: "resume", state: savedRun });
                else send({ type: "start" });
              }}
            />
          )}
          {modal === "rules" && (
            <HandInfo
              state={state.phase === "ready" && savedRun ? savedRun : state}
              onClose={() => setModal(null)}
            />
          )}
          {modal === "trace" && state.lastScore && (
            <Modal title={t("traceTitle")} onClose={() => setModal(null)}>
              <div className="trace-list">
                {state.lastScore.steps.map((item, index) => (
                  <div key={index}>
                    <span>
                      <b>{formatStep(item).source}</b>
                      <small>{formatStep(item).detail}</small>
                    </span>
                    <span className="pixel">
                      <i className="blue">{item.chips}</i> ×{" "}
                      <i className="coral">{number(item.mult)}</i>
                    </span>
                  </div>
                ))}
              </div>
              <p className="trace-total pixel">
                = {number(state.lastScore.score)} <small>{t("points")}</small>
              </p>
            </Modal>
          )}
          {modal === "restart" && (
            <Modal title={t("menuTitle")} onClose={() => setModal(null)}>
              <p className="modal-intro">{t("menuBody")}</p>
              <div className="modal-actions">
                <button
                  className="button neutral"
                  onClick={() => setModal(null)}
                >
                  {t("keepPlaying")}
                </button>
                <button
                  className="button coral"
                  onClick={() => {
                    send({
                      type: "menu",
                      seed: crypto.getRandomValues(new Uint32Array(1))[0],
                    });
                    setModal(null);
                  }}
                >
                  {t("menu")}
                </button>
              </div>
            </Modal>
          )}
          {inspected && (
            <Modal
              title={jokerText(inspected.kind).name}
              onClose={() => {
                setJokerId(null);
                setOfferDetail(null);
              }}
            >
              <div className="joker-inspector">
                <JokerArt kind={inspected.kind} />
                <div>
                  <h3 style={{ color: JOKERS[inspected.kind].color }}>
                    {jokerText(inspected.kind).effect}
                  </h3>
                  <RarityBadge kind={inspected.kind} />
                  <p>{jokerText(inspected.kind).description}</p>
                  {(inspected.kind === "supernova" || inspected.kind === "card_sharp") && (
                    <button className="joker-history-link" onClick={() => {
                      setJokerId(null);
                      setOfferDetail(null);
                      setModal("rules");
                    }}>{t("viewHandHistory")}</button>
                  )}
                  <JokerStatus
                    joker={inspected}
                    upcoming={state.phase === "shop"}
                  />
                  {ownedInspection && inspected.kind === "blueprint" && (
                    <p className="joker-status">
                      {!copyTarget
                        ? t("blueprintEmpty")
                        : !blueprintCompatible(copyTarget.kind)
                          ? t("blueprintIncompatible", {
                              name: jokerText(copyTarget.kind).name,
                            })
                          : disabledJoker(state) === copyTarget.id
                            ? t("blueprintDisabled")
                            : t("blueprintCopies", {
                                name: jokerText(copyTarget.kind).name,
                              })}
                    </p>
                  )}
                  {disabledJoker(state) === inspected.id && (
                    <p className="joker-status">
                      {t("jokerDisabled")}
                      {inspected.kind === "merry_andy" && ` · ${t("jokerFixedStatsRetained")}`}
                    </p>
                  )}
                  {ownedInspection && (
                    <div className="modal-actions">
                      <button
                        className="button neutral"
                        onClick={() => moveJoker(-1)}
                        disabled={state.jokers[0].id === inspected.id}
                      >
                        ← {t("moveLeft")}
                      </button>
                      <button
                        className="button neutral"
                        onClick={() => moveJoker(1)}
                        disabled={state.jokers.at(-1)?.id === inspected.id}
                      >
                        {t("moveRight")} →
                      </button>
                    </div>
                  )}
                  {!ownedInspection ? (
                    <button
                      className="button neutral"
                      onClick={() => setOfferDetail(null)}
                    >
                      {t("close")}
                    </button>
                  ) : state.phase === "shop" ? (
                    <button
                      className="button gold-button"
                      onClick={() => {
                        send({ type: "sell", id: inspected.id });
                        setJokerId(null);
                      }}
                    >
                      {t("sell", { price: JOKERS[inspected.kind].sell })}
                    </button>
                  ) : (
                    <small>{t("sellHint")}</small>
                  )}
                </div>
              </div>
            </Modal>
          )}
        </>
      )}
    </main>
  );
}
