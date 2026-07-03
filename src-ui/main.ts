import { mount } from "svelte"
import App from "@/App.svelte"
import "@/App.css"
import "@/lib/i18n"

if (import.meta.env.VITE_UI_FIXTURE === "true") {
  const { installTestFixture } = await import("@/lib/test-fixtures")
  installTestFixture()
}

document.documentElement.classList.add("dark")
mount(App, { target: document.getElementById("root")! })
