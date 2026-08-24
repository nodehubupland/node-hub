/* Node Hub patch: dashboard-only account view */
(function () {
    "use strict";

    function isDashboardRoute() {
        const hash = (window.location.hash || "").toLowerCase();
        return hash === "#dashboard" || hash === "#register";
    }

    function setDashboardView() {
        const dashboard = document.getElementById("nodehub-dashboard");
        const active = isDashboardRoute();

        document.body.classList.toggle("nodehub-dashboard-mode", active);

        if (dashboard) {
            dashboard.style.display = active ? "block" : "none";
        }

        if (!active) {
            document.getElementById("nodehub-dashboard-home-link")?.remove();
        }
    }

    function ensureDashboardControls() {
        if (!isDashboardRoute()) return;

        const dashboard = document.getElementById("nodehub-dashboard");
        if (!dashboard) return;

        const heading = dashboard.querySelector(".section-heading");
        if (!heading) return;

        if (!document.getElementById("nodehub-dashboard-home-link")) {
            const back = document.createElement("a");
            back.id = "nodehub-dashboard-home-link";
            back.href = "#home";
            back.className = "button button-secondary nodehub-dashboard-home-link";
            back.textContent = "← Back to Node Hub";
            heading.appendChild(back);
        }

        const logout = document.getElementById("dashboard-logout-button");
        if (logout) {
            logout.style.display = "inline-flex";
            logout.textContent = "Sign out";
        }
    }

    function removeDuplicateUplandField() {
        document.getElementById("nodehub-upland-link-field")?.remove();
    }

    function boot() {
        setDashboardView();
        ensureDashboardControls();
        removeDuplicateUplandField();

        window.addEventListener("hashchange", function () {
            setTimeout(setDashboardView, 50);
            setTimeout(ensureDashboardControls, 100);
            setTimeout(removeDuplicateUplandField, 100);
        });

        const observer = new MutationObserver(function () {
            setDashboardView();
            ensureDashboardControls();
            removeDuplicateUplandField();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    const style = document.createElement("style");
    style.textContent = `
        body.nodehub-dashboard-mode > .site-header,
        body.nodehub-dashboard-mode > main,
        body.nodehub-dashboard-mode > .site-footer {
            display: none !important;
        }

        body.nodehub-dashboard-mode {
            min-height: 100vh;
        }

        body.nodehub-dashboard-mode #nodehub-dashboard {
            display: block !important;
            min-height: 100vh;
        }

        .nodehub-dashboard-home-link {
            margin-top: 12px;
        }
    `;
    document.head.appendChild(style);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
