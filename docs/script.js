;(function () {
  "use strict"

  var root = document.documentElement
  root.classList.add("js")
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

  /* ---- Theme toggle + persistence ---- */
  var themeToggle = document.getElementById("theme-toggle")
  if (themeToggle) {
    var updateThemeLabel = function () {
      themeToggle.setAttribute(
        "aria-label",
        root.getAttribute("data-theme") === "light"
          ? "Switch to dark theme"
          : "Switch to light theme",
      )
    }
    updateThemeLabel()
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light"
      root.setAttribute("data-theme", next)
      updateThemeLabel()
      try {
        localStorage.setItem("radianite-theme", next)
      } catch {
        // Theme switching still works when browser storage is unavailable.
      }
    })
  }

  /* ---- Mobile nav toggle ---- */
  var navToggle = document.getElementById("nav-toggle")
  var nav = document.getElementById("primary-nav")
  if (navToggle && nav) {
    var setNav = function (open) {
      nav.classList.toggle("open", open)
      navToggle.setAttribute("aria-expanded", String(open))
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu")
    }
    navToggle.addEventListener("click", function () {
      setNav(!nav.classList.contains("open"))
    })
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setNav(false)
    })
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) {
        setNav(false)
        navToggle.focus()
      }
    })
    var closeOutsideNav = function (e) {
      if (!nav.contains(e.target) && !navToggle.contains(e.target))
        setNav(false)
    }
    document.addEventListener("click", closeOutsideNav)
    document.addEventListener("focusin", closeOutsideNav)
    window
      .matchMedia("(max-width: 720px)")
      .addEventListener("change", function () {
        setNav(false)
      })
  }

  /* ---- Resolve the latest Windows installer from GitHub ---- */
  var downloadLinks = document.querySelectorAll(".js-download")
  var setDownloadUrl = function (url) {
    downloadLinks.forEach(function (link) {
      link.href = url
      link.setAttribute("download", "")
    })
  }

  if (downloadLinks.length) {
    fetch(
      "https://api.github.com/repos/builtbyshnk/radianite_val/releases/latest",
      {
        headers: { Accept: "application/vnd.github+json" },
      },
    )
      .then(function (res) {
        if (!res.ok) throw new Error("GitHub API " + res.status)
        return res.json()
      })
      .then(function (release) {
        var assets = Array.isArray(release.assets) ? release.assets : []
        var installer = assets.find(function (asset) {
          return /^Radianite_.+_windows_x64\.exe$/i.test(asset.name)
        })
        if (!installer || !installer.browser_download_url) return

        setDownloadUrl(installer.browser_download_url)
      })
      .catch(function () {})
  }

  /* ---- Loop the demo while respecting motion preferences ---- */
  var demo = document.querySelector(".demo-frame video")
  if (demo) {
    if (!reducedMotion.matches) demo.play().catch(function () {})
    reducedMotion.addEventListener("change", function (e) {
      if (e.matches) demo.pause()
    })
  }

  /* ---- Scroll reveal (progressive enhancement) ---- */
  var revealables = document.querySelectorAll(".reveal")
  if (
    "IntersectionObserver" in window &&
    revealables.length &&
    !reducedMotion.matches
  ) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.remove("reveal-pending")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    )
    revealables.forEach(function (el) {
      el.classList.add("reveal-pending")
      observer.observe(el)
    })
  }
})()
