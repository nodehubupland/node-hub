// Node Hub V1 patch loader
(function () {
    const style = document.createElement("style");
    style.textContent = `
        @media (max-width: 760px) {
            #map .map-preview { min-height: 560px; }
            #map .node-map-content { grid-template-columns: 1fr !important; }
            #map #node-map-list { max-height: 230px !important; }
            #map .node-map-live { padding: 18px !important; }
        }
    `;
    document.head.appendChild(style);

    const script = document.createElement("script");
    script.src = "directory-navigation.js?v=20260824";
    script.async = false;
    document.body.appendChild(script);
})();
