import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/consoleCapture";
import { registerPWA } from "./pwa/registerSW";
import GlobalErrorBoundary from "@/components/shared/GlobalErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <GlobalErrorBoundary>
    <App />
  </GlobalErrorBoundary>
);

registerPWA();
