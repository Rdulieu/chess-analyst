import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { App } from "./App";
// The app's one stylesheet (ADR-0013): SCSS compiled by Vite, tokens as custom
// properties. Imported here and nowhere else, so the cascade has one order.
import "./styles/main.scss";

const root = document.getElementById("root");
if (!root) throw new Error("Root element #root not found");

createRoot(root).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
