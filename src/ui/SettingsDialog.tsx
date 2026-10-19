import { useState } from "react";
import { useI18n } from "../i18n/I18n";
import type { Locale } from "../i18n/locale";
import { DEFAULT_PACK_WEIGHTS } from "../game/config";
import { validRules } from "../game/rules";
import {
  defaultSettings,
  type Settings,
  type AnimationSpeed,
  type AudioSettings,
} from "../settings/settings";
import { Modal } from "./Modal";

function fields(settings: Settings) {
  return {
    hands: String(settings.rules.hands),
    discards: String(settings.rules.discards),
    money: String(settings.rules.money),
    targets: settings.rules.targets.map(String),
    packWeights: { ...(settings.rules.packWeights ?? DEFAULT_PACK_WEIGHTS) },
  };
}
export function SettingsDialog({
  settings,
  onSave,
  onClose,
  onAudioPreview,
}: {
  settings: Settings;
  onSave: (settings: Settings, locale: Locale) => void;
  onClose: () => void;
  onAudioPreview: (audio: AudioSettings) => void;
}) {
  const { t, locale } = useI18n();
  const [language, setLanguage] = useState(locale);
  const [animation, setAnimation] = useState(settings.animation);
  const [audio, setAudio] = useState(settings.audio);
  const [crt, setCrt] = useState(settings.crt);
  const [values, setValues] = useState(() => fields(settings));
  const [error, setError] = useState(false);
  function updateAudio(next: AudioSettings) {
    setAudio(next);
    onAudioPreview(next);
  }
  return (
    <Modal title={t("settings")} onClose={onClose}>
      <form
        className="settings-form"
        onSubmit={(event) => {
          event.preventDefault();
          const rules = {
            hands: Number(values.hands),
            discards: Number(values.discards),
            money: Number(values.money),
            targets: values.targets.map(Number),
            packWeights: values.packWeights,
          };
          if (!validRules(rules)) {
            setError(true);
            return;
          }
          onSave({ version: 6, animation, crt, audio, rules }, language);
        }}
      >
        <label className="setting-row">
          <span>{t("language")}</span>
          <select
            value={language}
            onChange={(event) => setLanguage(event.target.value as Locale)}
          >
            <option value="zh-CN">简体中文</option>
            <option value="en">English</option>
          </select>
        </label>
        <fieldset>
          <legend>{t("displaySettings")}</legend>
          <label className="setting-row">
            <span>{t("animationSpeed")}</span>
            <select
              value={animation}
              onChange={(event) =>
                setAnimation(event.target.value as AnimationSpeed)
              }
            >
              <option value="normal">{t("normalSpeed")}</option>
              <option value="fast">{t("fastSpeed")}</option>
              <option value="instant">{t("instantSpeed")}</option>
            </select>
          </label>
          <label className="setting-row">
            <span>{t("crtEffect")}</span>
            <input
              type="checkbox"
              checked={crt}
              onChange={(event) => setCrt(event.target.checked)}
            />
          </label>
        </fieldset>
        <fieldset>
          <legend>{t("audioSettings")}</legend>
          {(["music", "effects"] as const).map((channel) => {
            const volume =
              channel === "music" ? "musicVolume" : "effectsVolume";
            return (
              <div key={channel}>
                <label className="setting-row">
                  <span>
                    {t(channel === "music" ? "musicEnabled" : "effectsEnabled")}
                  </span>
                  <input
                    type="checkbox"
                    checked={audio[channel]}
                    onChange={(event) =>
                      updateAudio({ ...audio, [channel]: event.target.checked })
                    }
                  />
                </label>
                <label className="setting-row audio-volume">
                  <span>
                    {t(volume)} <output>{audio[volume]}%</output>
                  </span>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    disabled={!audio[channel]}
                    value={audio[volume]}
                    onChange={(event) =>
                      updateAudio({
                        ...audio,
                        [volume]: Number(event.target.value),
                      })
                    }
                  />
                </label>
              </div>
            );
          })}
        </fieldset>
        <fieldset>
          <legend>{t("gameSettings")}</legend>
          <p className="settings-hint">{t("settingsRulesHint")}</p>
          {(
            [
              { key: "money", label: "startingMoney", min: 0, max: 99 },
              { key: "hands", label: "handsPerRound", min: 1, max: 10 },
              { key: "discards", label: "discardsPerRound", min: 0, max: 10 },
            ] as const
          ).map((field) => (
            <label className="setting-row" key={field.key}>
              <span>
                {t(field.label)}{" "}
                <small>
                  {field.min}–{field.max}
                </small>
              </span>
              <input
                type="number"
                inputMode="numeric"
                required
                min={field.min}
                max={field.max}
                step={1}
                value={values[field.key]}
                onChange={(event) => {
                  setValues({ ...values, [field.key]: event.target.value });
                  setError(false);
                }}
              />
            </label>
          ))}
          {[0, 1, 2].map((set) => (
            <div
              className="target-set"
              key={set}
              role="group"
              aria-label={t("setTargets", { stage: set + 1 })}
            >
              <h3>{t("setTargets", { stage: set + 1 })}</h3>
              <div className="target-grid">
                {[0, 1, 2].map((round) => {
                  const index = set * 3 + round;
                  return (
                    <label key={round}>
                      <span>
                        {t("roundNumber", { round: round + 1 })}
                        {round === 2 ? ` · ${t("penaltyLabel")}` : ""}
                      </span>
                      <input
                        type="number"
                        inputMode="numeric"
                        required
                        min={50}
                        max={50000}
                        step={1}
                        aria-label={t("roundTarget", {
                          stage: set + 1,
                          round: round + 1,
                        })}
                        value={values.targets[index]}
                        onChange={(event) => {
                          setValues({
                            ...values,
                            targets: values.targets.map((value, i) =>
                              i === index ? event.target.value : value,
                            ),
                          });
                          setError(false);
                        }}
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          ))}
          <details className="draw-settings">
            <summary>{t("drawSettings")}</summary>
            <p className="settings-hint">{t("uniformJokersHint")}</p>
            <p className="settings-hint">{t("packWeightsHint")}</p>
            {(["buffoon", "jumbo", "mega"] as const).map((key) => (
              <label className="setting-row" key={key}>
                <span>{t(key)}</span>
                <input
                  type="number"
                  min={1}
                  max={100}
                  step={1}
                  required
                  value={values.packWeights[key]}
                  onChange={(event) => {
                    setValues({
                      ...values,
                      packWeights: {
                        ...values.packWeights,
                        [key]: Number(event.target.value),
                      },
                    });
                    setError(false);
                  }}
                />
              </label>
            ))}
          </details>
        </fieldset>
        {error && (
          <p className="settings-error" role="alert">
            {t("invalidSettings")}
          </p>
        )}
        <button
          type="button"
          className="reset-settings"
          onClick={() => {
            const defaults = defaultSettings();
            setValues(fields(defaults));
            setAnimation(defaults.animation);
            setCrt(defaults.crt);
            updateAudio(defaults.audio);
            setError(false);
          }}
        >
          {t("resetDefaults")}
        </button>
        <div className="modal-actions settings-actions">
          <button type="button" className="button neutral" onClick={onClose}>
            {t("cancel")}
          </button>
          <button type="submit" className="button green">
            {t("saveSettings")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
