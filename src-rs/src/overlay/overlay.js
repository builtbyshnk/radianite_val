const themes = new Set([
  "nightfall",
  "catppuccin",
  "evergreen",
  "solarized",
  "porcelain",
  "rose",
])
document.documentElement.dataset.theme = "nightfall"
if (window.parent !== window) {
  document.documentElement.dataset.embed = "true"
}

const rankIcon = document.getElementById("rankIcon")
const fallbackIcon = document.getElementById("fallbackIcon")
const rankName = document.getElementById("rankName")
const rankRR = document.getElementById("rankRR")
const playerName = document.getElementById("playerName")
const delta = document.getElementById("delta")
const statusText = document.getElementById("statusText")

function setWaiting(message) {
  document.body.classList.add("waiting")
  rankIcon.hidden = true
  fallbackIcon.hidden = false
  rankName.textContent = "Waiting"
  rankRR.textContent = ""
  playerName.textContent = "Radianite overlay"
  delta.textContent = "Waiting"
  delta.className = "delta neutral"
  statusText.textContent = message || "Waiting for rank"
}

function render(data) {
  document.documentElement.dataset.theme = themes.has(data?.theme)
    ? data.theme
    : "nightfall"
  document.body.classList.toggle("hide-details", data?.hideDetails === true)
  if (!data || data.status !== "ready" || !data.rank) {
    setWaiting(data && data.message)
    return
  }

  document.body.classList.remove("waiting")
  const rank = data.rank
  rankName.textContent = rank.tierName || (rank.tier ? `Tier ${rank.tier}` : "Unrated")
  rankRR.textContent = typeof rank.rankedRating === "number" ? `${rank.rankedRating} RR` : ""
  playerName.textContent = data.player?.gameName
    ? data.player.gameName + (data.player.gameTag ? `#${data.player.gameTag}` : "")
    : "Current rank"

  if (rank.iconUrl) {
    rankIcon.src = rank.iconUrl
    rankIcon.hidden = false
    fallbackIcon.hidden = true
  } else {
    rankIcon.hidden = true
    fallbackIcon.hidden = false
  }

  if (typeof rank.lastMatchDelta === "number") {
    delta.textContent = `${rank.lastMatchDelta > 0 ? "+" : ""}${rank.lastMatchDelta} RR`
    delta.className = rank.lastMatchDelta < 0 ? "delta negative" : "delta"
  } else {
    delta.textContent = "Unavailable"
    delta.className = "delta neutral"
  }
  statusText.textContent = "Live rank"
}

async function refresh() {
  try {
    const response = await fetch("/overlay/state", { cache: "no-store" })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    render(await response.json())
  } catch (_error) {
    setWaiting("Overlay disconnected")
  }
}

refresh()
setInterval(refresh, 2000)
