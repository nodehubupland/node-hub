// Node Hub V1 patch loader
// Loaded after app.js by index.html.
// Loads the shared navigation, bilingual UI and live world map features.
(function () {
    const script = document.createElement("script");
    script.src = "directory-navigation.js?v=20260824";
    script.async = false;
    document.body.appendChild(script);
})();
