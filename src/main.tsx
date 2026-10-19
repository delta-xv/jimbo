import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "@fontsource/vt323/latin-400.css";
import "./styles.css";
import "./mobile.css";
import "./cards.css";
import "./flows.css";
import "./tutorial.css";
import "./hand-info.css";
import App from "./App";
import { I18nProvider } from "./i18n/I18n";
import { prepareStorage } from "./storage/initialize";

const root = createRoot(document.getElementById("root")!);
async function start() {
  root.render(
    <main className="startup" aria-busy="true">
      正在读取本地数据… / Loading saved data…
    </main>,
  );
  try {
    await prepareStorage();
    root.render(
      <StrictMode>
        <I18nProvider>
          <App />
        </I18nProvider>
      </StrictMode>,
    );
  } catch {
    root.render(
      <main className="startup" role="alert">
        <p>暂时无法读取本地数据，请重试。</p>
        <p>Saved data is unavailable. Please try again.</p>
        <button className="button" onClick={() => void start()}>
          重试 / Retry
        </button>
      </main>,
    );
  }
}
void start();
