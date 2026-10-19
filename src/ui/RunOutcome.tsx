import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { useI18n } from "../i18n/I18n";
import { SUITS } from "../game/config";
import { SuitIcon } from "./CardFace";

export function RunOutcome({
  outcome,
  enabled,
  scale,
  onAgain,
  onMenu,
  backRef,
}: {
  outcome: "won" | "lost";
  enabled: boolean;
  scale: number;
  onAgain: () => void;
  onMenu: () => void;
  backRef: RefObject<() => void>;
}) {
  const { t } = useI18n();
  const [finished, setFinished] = useState(!enabled);
  const ready = finished || !enabled;
  const title = outcome === "won" ? "YOU WIN!" : "GAME OVER";
  const titleRef = useRef<HTMLHeadingElement>(null);
  const againRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    titleRef.current?.focus({ preventScroll: true });
  }, []);
  useEffect(() => {
    if (ready) return;
    const timer = window.setTimeout(
      () => setFinished(true),
      (outcome === "won" ? 1200 : 800) * scale,
    );
    return () => window.clearTimeout(timer);
  }, [ready, outcome, scale]);
  useEffect(() => {
    backRef.current = () => {
      if (ready) onMenu();
      else setFinished(true);
    };
    return () => {
      backRef.current = () => {};
    };
  }, [backRef, ready, onMenu]);
  useEffect(() => {
    if (ready) againRef.current?.focus({ preventScroll: true });
  }, [ready]);
  return (
    <section
      className={`end-screen ${outcome === "won" ? "end-win" : "end-loss"} ${ready ? "is-ready" : "is-entering"}`}
      data-outcome-phase={ready ? "ready" : "intro"}
      aria-label={title}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          event.preventDefault();
          event.stopPropagation();
          if (ready) onMenu();
          else setFinished(true);
        }
      }}
    >
      <div className="end-art" aria-hidden="true">
        {outcome === "won"
          ? Array.from({ length: 12 }, (_, i) => (
              <span
                key={i}
                className="end-particle"
                style={
                  {
                    "--dx": `${((i % 6) - 2.5) * 17}vw`,
                    "--dy": `${i < 6 ? -34 + (i % 3) * 7 : 31 - (i % 3) * 6}vh`,
                    "--spin": `${i * 38}deg`,
                    "--delay": `${(i % 3) * 45}ms`,
                  } as CSSProperties
                }
              >
                <SuitIcon suit={SUITS[i % 4]} />
              </span>
            ))
          : [0, 1, 2].map((i) => (
              <span
                key={i}
                className="end-falling-card"
                style={
                  {
                    "--card-x": `${25 + i * 25}%`,
                    "--spin": `${(i - 1) * 22}deg`,
                    "--delay": `${i * 60}ms`,
                  } as CSSProperties
                }
              >
                ♠
              </span>
            ))}
      </div>
      <div className="end-content">
        <h1
          className="end-title"
          ref={titleRef}
          tabIndex={-1}
          aria-live="polite"
        >
          {title}
        </h1>
        {
          <div className="end-actions" aria-hidden={!ready}>
            <button
              ref={againRef}
              disabled={!ready}
              className="button gold-button"
              onClick={onAgain}
            >
              {t("playAgain")}
            </button>
            <button
              className="button neutral"
              disabled={!ready}
              onClick={onMenu}
            >
              {t("menu")}
            </button>
          </div>
        }
      </div>
      {!ready && (
        <button
          className="end-skip"
          aria-label={t("skipOutcomeAnimation")}
          onClick={(event) => {
            event.stopPropagation();
            setFinished(true);
          }}
        >
          <span>{t("tapToSkip")}</span>
        </button>
      )}
    </section>
  );
}
