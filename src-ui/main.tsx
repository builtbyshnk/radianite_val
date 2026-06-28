import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { useTranslation } from "react-i18next";
import "@/lib/i18n";

document.documentElement.classList.add("dark");

if (import.meta.env.PROD) {
  document.addEventListener("contextmenu", (event) => {
    event.preventDefault();
  });
}

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <TooltipProvider delayDuration={200}>
      <App />
      <LocalizedToaster />
    </TooltipProvider>
  </React.StrictMode>,
);

function LocalizedToaster() {
  const { i18n } = useTranslation();
  return <Toaster position={i18n.dir() === "rtl" ? "bottom-left" : "bottom-right"} />;
}
