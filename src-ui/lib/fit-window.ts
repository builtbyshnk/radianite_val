import { isTauri } from "@tauri-apps/api/core"
import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window"

export function fitWindow(main: HTMLElement) {
  if (!isTauri()) return

  const appWindow = getCurrentWindow()
  let timer: ReturnType<typeof setTimeout>
  let updates = Promise.resolve()
  const observer = new ResizeObserver(() => {
    clearTimeout(timer)
    timer = setTimeout(() => {
      updates = updates
        .then(async () => {
          const content = main.firstElementChild
          const header = main.previousElementSibling
          const footer = main.nextElementSibling
          if (!main.isConnected || !content || !header || !footer) return

          const style = getComputedStyle(main)
          const height = Math.min(
            900,
            Math.max(
              700,
              Math.ceil(
                content.getBoundingClientRect().height +
                  header.getBoundingClientRect().height +
                  footer.getBoundingClientRect().height +
                  parseFloat(style.paddingTop) +
                  parseFloat(style.paddingBottom),
              ),
            ),
          )
          await appWindow.setMinSize(new LogicalSize(1152, height))
          if (window.innerHeight !== height)
            await appWindow.setSize(new LogicalSize(window.innerWidth, height))
        })
        .catch(console.error)
    }, 100)
  })

  // Wait until the title bar and status bar have both mounted.
  queueMicrotask(() => {
    if (!main.isConnected) return
    for (const element of [
      main.firstElementChild,
      main.previousElementSibling,
      main.nextElementSibling,
    ])
      if (element) observer.observe(element)
  })

  return {
    destroy() {
      clearTimeout(timer)
      observer.disconnect()
    },
  }
}
