// Importar polyfills primeiro, antes de qualquer outra coisa
import "./utils/polyfills";

import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { Toaster } from "@/components/ui/toaster";

createRoot(document.getElementById("root")!).render(
  <>
    <App />
    <Toaster />
  </>
);
