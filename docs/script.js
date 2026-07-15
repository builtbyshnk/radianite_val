(function () {
  "use strict";

  var root = document.documentElement;

  /* ---- Theme toggle + persistence ---- */
  var themeToggle = document.getElementById("theme-toggle");
  if (themeToggle) {
    themeToggle.addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "light" ? "dark" : "light";
      root.setAttribute("data-theme", next);
      try {
        localStorage.setItem("radianite-theme", next);
      } catch (e) {}
    });
  }

  /* ---- Mobile nav toggle ---- */
  var navToggle = document.getElementById("nav-toggle");
  var nav = document.getElementById("primary-nav");
  if (navToggle && nav) {
    var setNav = function (open) {
      nav.classList.toggle("open", open);
      navToggle.setAttribute("aria-expanded", String(open));
      navToggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    };
    navToggle.addEventListener("click", function () {
      setNav(!nav.classList.contains("open"));
    });
    nav.addEventListener("click", function (e) {
      if (e.target.tagName === "A") setNav(false);
    });
  }

  /* ---- Resolve the latest Windows installer from GitHub ---- */
  var downloadLinks = document.querySelectorAll(".js-download");
  var cachedTagKey = "radianite-latest-release-tag";

  var setDownloadUrl = function (url) {
    downloadLinks.forEach(function (link) {
      link.href = url;
      link.setAttribute("download", "");
    });
  };

  var installerUrlFromTag = function (tag) {
    if (!/^v?\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(tag)) return null;
    var version = tag.replace(/^v/i, "");
    return (
      "https://github.com/builtbyshnk/radianite_val/releases/download/" +
      encodeURIComponent(tag) +
      "/Radianite_" +
      encodeURIComponent(version) +
      "_windows_x64.exe"
    );
  };

  if (downloadLinks.length) {
    fetch("https://api.github.com/repos/builtbyshnk/radianite_val/releases/latest", {
      headers: { Accept: "application/vnd.github+json" }
    })
      .then(function (res) {
        var rateLimited =
          res.status === 429 ||
          (res.status === 403 && res.headers.get("x-ratelimit-remaining") === "0");
        if (rateLimited) {
          var error = new Error("GitHub API rate limit exceeded");
          error.rateLimited = true;
          throw error;
        }
        if (!res.ok) throw new Error("GitHub API " + res.status);
        return res.json();
      })
      .then(function (release) {
        var assets = release.assets || [];
        var installer = assets.find(function (asset) {
          return /^Radianite_.+_windows_x64\.exe$/i.test(asset.name);
        });
        if (!installer || !installer.browser_download_url || !release.tag_name) return;

        setDownloadUrl(installer.browser_download_url);
        try {
          localStorage.setItem(cachedTagKey, release.tag_name);
        } catch (e) {}
      })
      .catch(function (error) {
        if (!error.rateLimited) return;
        try {
          var cachedUrl = installerUrlFromTag(localStorage.getItem(cachedTagKey) || "");
          if (cachedUrl) setDownloadUrl(cachedUrl);
        } catch (e) {}
      });
  }

  /* ---- Scroll reveal (progressive enhancement) ---- */
  var revealables = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && revealables.length) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );
    revealables.forEach(function (el) {
      observer.observe(el);
    });
  } else {
    revealables.forEach(function (el) {
      el.classList.add("is-visible");
    });
  }
})();
