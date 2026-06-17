// src/main.tsx
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

const el = document.getElementById("root");
if (!el) throw new Error("找不到 #root 節點");

createRoot(el).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
