// src/download/main.tsx — entry point for the standalone download page.
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import DownloadApp from "./DownloadApp";
import "./download.css";

const el = document.getElementById("root");
if (!el) throw new Error("找不到 #root 節點");

createRoot(el).render(
  <StrictMode>
    <DownloadApp />
  </StrictMode>,
);
