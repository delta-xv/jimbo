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

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
