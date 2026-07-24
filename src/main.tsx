import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import "./lib/consoleCapture";
import { registerPWA } from "./pwa/registerSW";

createRoot(document.getElementById("root")!).render(<App />);

registerPWA();
