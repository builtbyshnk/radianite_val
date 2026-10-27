;(function () {
  "use strict"

  var root = document.documentElement
  root.classList.add("js")
  var reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)")

  /* ---- Site language: explicit preference, then browser language ---- */
  var languageSelect = document.getElementById("language-select")
  var english = {
    "theme.dark": "Switch to dark theme",
    "theme.light": "Switch to light theme",
    "nav.close": "Close menu",
  }
  var bindings = []
  ;[null, "content", "aria-label"].forEach(function (attribute) {
    var marker = attribute ? "data-i18n-" + attribute : "data-i18n"
    document.querySelectorAll("[" + marker + "]").forEach(function (element) {
      var key = element.getAttribute(marker)
      english[key] = attribute
        ? element.getAttribute(attribute)
        : element.textContent
      bindings.push({ element: element, key: key, attribute: attribute })
    })
  })
  var messages = english
  var t = function (key) {
    return messages[key] || english[key]
  }
  var languageRequest = 0

  var setLanguage = async function (tag, remember) {
    var request = ++languageRequest
    var translated = english
    try {
      if (tag !== "en-US") {
        var response = await fetch("/radianite/locales/" + tag + ".json")
        if (!response.ok) throw new Error("Translation unavailable")
        translated = Object.assign({}, english, await response.json())
      }
    } catch {
      if (request === languageRequest) languageSelect.value = root.lang
      return
    }
    if (request !== languageRequest) return

    messages = translated
    root.lang = tag
    root.dir = languageSelect.querySelector('option[value="' + tag + '"]').dir
    languageSelect.value = tag
    bindings.forEach(function (binding) {
      if (binding.attribute)
        binding.element.setAttribute(binding.attribute, t(binding.key))
      else binding.element.textContent = t(binding.key)
    })
    document.querySelector('meta[property="og:locale"]').content = tag.replace(
      "-",
      "_",
    )
    if (themeToggle) updateThemeLabel()
    if (navToggle && nav) setNav(nav.classList.contains("open"))
    if (remember) {
      try {
        localStorage.setItem("radianite-language", tag)
      } catch {
        // Selection still works when browser storage is unavailable.
      }
    }
  }

  if (languageSelect) {
    var supportedLanguages = Array.from(languageSelect.options).map(
      function (option) {
        return option.value
      },
    )
    var savedLanguage
    try {
      savedLanguage = localStorage.getItem("radianite-language")
    } catch {
      // Browser language is still available when storage is blocked.
    }
    var initialLanguage = supportedLanguages.includes(savedLanguage)
      ? savedLanguage
      : "en-US"
    if (!supportedLanguages.includes(savedLanguage)) {
      var candidates = navigator.languages.length
        ? navigator.languages
        : [navigator.language]
      for (var candidate of candidates) {
        var canonical
        try {
          canonical = Intl.getCanonicalLocales(candidate)[0]
        } catch {
          continue
        }
        var matched =
          supportedLanguages.find(function (tag) {
            return tag === canonical
          }) ||
          supportedLanguages.find(function (tag) {
            return tag.split("-")[0] === canonical.split("-")[0]
          })
        if (matched) {
          initialLanguage = matched
          break
        }
      }
    }
    languageSelect.hidden = false
    languageSelect.addEventListener("change", function () {
      setLanguage(languageSelect.value, true)
    })
  }

  /* ---- Theme toggle + persistence ---- */
  var themeToggle = document.getElementById("theme-toggle")
  if (themeToggle) {
    var updateThemeLabel = function () {
      themeToggle.setAttribute(
        "aria-label",
        root.getAttribute("data-theme") === "light"
          ? t("theme.dark")
          : t("theme.light"),
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
      navToggle.setAttribute(
        "aria-label",
        open ? t("nav.close") : t("nav.open"),
      )
    }
    navToggle.addEventListener("click", function () {
      setNav(!nav.classList.contains("open"))
    })
    nav.addEventListener("click", function (e) {
      if (e.target.closest("a")) setNav(false)
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
      .matchMedia("(max-width: 900px)")
      .addEventListener("change", function () {
        setNav(false)
      })
  }

  if (languageSelect) setLanguage(initialLanguage, false)

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
