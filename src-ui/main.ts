import { mount } from "svelte"
import App from "@/App.svelte"
import "@/App.css"
import "@/lib/i18n"

if (import.meta.env.VITE_UI_FIXTURE === "true") {
  const { installTestFixture } = await import("@/lib/test-fixtures")
  installTestFixture()
}

document.documentElement.classList.add("dark")
const target = document.getElementById("root")!
target.replaceChildren()
mount(App, { target })
