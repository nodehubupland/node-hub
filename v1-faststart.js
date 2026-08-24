/* Node Hub V1 fast-start safety layer */
(function () {
  function startPublicData() {
    try { if (typeof loadNodes === "function") loadNodes(); } catch (e) { console.error("Directory start error:", e); }
    try { if (typeof initializeWorldMap === "function") initializeWorldMap(); } catch (e) { console.error("Map start error:", e); }
  }

  function startLanguage() {
    const selector = document.getElementById("language-selector");
    if (!selector) return;
    const saved = localStorage.getItem("nodehub-language") || "en-US";
    selector.value = saved === "pt-BR" ? "pt-BR" : "en-US";
    document.documentElement.lang = selector.value === "pt-BR" ? "pt-BR" : "en";
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", function () {
      startLanguage();
      setTimeout(startPublicData, 150);
    }, { once: true });
  } else {
    startLanguage();
    setTimeout(startPublicData, 150);
  }
})();