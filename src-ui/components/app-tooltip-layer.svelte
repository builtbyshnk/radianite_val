<script lang="ts">
  import { tick } from "svelte"

  let text = $state("")
  let visible = $state(false)
  let left = $state(0)
  let top = $state(0)
  let tooltip: HTMLDivElement
  let activeTarget: HTMLElement | null = null

  function prepare(element: HTMLElement) {
    const title = element.getAttribute("title")
    if (!title) return

    element.dataset.appTooltip = title
    element.removeAttribute("title")
    if (
      !element.hasAttribute("aria-label") &&
      element.matches("button,a,input,select,textarea,[role='button']")
    )
      element.setAttribute("aria-label", title)
  }

  function tooltipTarget(target: EventTarget | null) {
    if (!(target instanceof Element)) return null
    const element = target.closest<HTMLElement>("[title],[data-app-tooltip]")
    if (element) prepare(element)
    return element?.dataset.appTooltip ? element : null
  }

  async function show(target: HTMLElement) {
    activeTarget = target
    text = target.dataset.appTooltip ?? ""
    visible = Boolean(text)
    if (!visible) return

    await tick()
    if (activeTarget !== target) return
    const targetRect = target.getBoundingClientRect()
    const tooltipRect = tooltip.getBoundingClientRect()
    left = Math.min(
      window.innerWidth - tooltipRect.width / 2 - 8,
      Math.max(
        tooltipRect.width / 2 + 8,
        targetRect.left + targetRect.width / 2,
      ),
    )
    top =
      targetRect.bottom + tooltipRect.height + 12 <= window.innerHeight
        ? targetRect.bottom + 8
        : targetRect.top - tooltipRect.height - 8
  }

  function hide(target: HTMLElement | null) {
    if (target !== activeTarget) return
    activeTarget = null
    visible = false
  }

  function onPointerOver(event: PointerEvent) {
    const target = tooltipTarget(event.target)
    if (target && !target.contains(event.relatedTarget as Node | null))
      void show(target)
  }

  function onPointerOut(event: PointerEvent) {
    const target = tooltipTarget(event.target)
    if (target && !target.contains(event.relatedTarget as Node | null))
      hide(target)
  }

  function onFocusIn(event: FocusEvent) {
    const target = tooltipTarget(event.target)
    if (target) void show(target)
  }

  function onFocusOut(event: FocusEvent) {
    hide(tooltipTarget(event.target))
  }

  $effect(() => {
    const prepareTree = (root: ParentNode) => {
      if (root instanceof HTMLElement && root.hasAttribute("title"))
        prepare(root)
      root.querySelectorAll<HTMLElement>("[title]").forEach(prepare)
    }
    prepareTree(document)
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "attributes")
          prepare(mutation.target as HTMLElement)
        else
          mutation.addedNodes.forEach((node) => {
            if (node instanceof HTMLElement) prepareTree(node)
          })
      }
    })
    observer.observe(document.body, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["title"],
    })
    return () => observer.disconnect()
  })
</script>

<svelte:window
  onpointerover={onPointerOver}
  onpointerout={onPointerOut}
  onfocusin={onFocusIn}
  onfocusout={onFocusOut}
/>

<div
  bind:this={tooltip}
  role="tooltip"
  aria-hidden={!visible}
  data-visible={visible}
  class="pointer-events-none fixed z-[100] max-w-xs rounded-lg border border-border/70 bg-popover/95 px-2.5 py-1.5 text-xs font-medium tracking-wide text-popover-foreground opacity-0 shadow-lg shadow-black/20 backdrop-blur-md transition-[opacity,transform] duration-150 data-[visible=true]:opacity-100"
  style:left="{left}px"
  style:top="{top}px"
  style:transform="translateX(-50%) scale({visible ? 1 : 0.96})"
>
  {text}
</div>
