// src/download/main.tsx — entry point for the standalone download page.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DownloadApp from "./DownloadApp";
import { I18nProvider } from "../i18n";
import "./download.css";

const el = document.getElementById("root");
if (!el) throw new Error("找不到 #root 節點");

createRoot(el).render(
  <StrictMode>
    <I18nProvider>
      <DownloadApp />
    </I18nProvider>
  </StrictMode>,
);
