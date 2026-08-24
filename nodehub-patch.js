/* Node Hub patch: dashboard-only account view + Upland Node Link placement + login repair */
(function () {
    "use strict";

    const SUPABASE_URL = "https://ynqtzyzxspoxssjrjeve.supabase.co";
    const SUPABASE_KEY = "sb_publishable_FoDbr9qgVeeIYfzEZNNN9Q_53aHxI2g";
    const authClient = window.supabase?.createClient
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY)
        : null;

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

        if (active) {
            hideSiteContent();
        } else {
            restoreSiteContent();
        }
    }

    function hideSiteContent() {
        const dashboard = document.getElementById("nodehub-dashboard");
        if (!dashboard) return;

        Array.from(document.body.children).forEach(child => {
            if (child === dashboard) {
                child.style.display = "block";
                return;
            }

            child.dataset.nodehubOriginalDisplay ??= child.style.display || "";
            child.style.display = "none";
        });
    }

    function restoreSiteContent() {
        Array.from(document.body.children).forEach(child => {
            if (child.id === "nodehub-dashboard") {
                child.style.display = "none";
                return;
            }

            if (child.dataset.nodehubOriginalDisplay !== undefined) {
                child.style.display = child.dataset.nodehubOriginalDisplay;
                delete child.dataset.nodehubOriginalDisplay;
            }
        });
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

    function moveUplandNodeLink() {
        const input = document.getElementById("node-upland-url");
        if (!input) return;

        const form = input.closest("form");
        if (!form) return;

        const label = form.querySelector('label[for="node-upland-url"]');
        const help = input.nextElementSibling;
        const locationInput = document.getElementById("node-upland-location");
        const locationHelp = locationInput?.nextElementSibling;

        if (!label) return;

        let wrapper = document.getElementById("nodehub-upland-link-field");

        if (!wrapper) {
            wrapper = document.createElement("div");
            wrapper.id = "nodehub-upland-link-field";
            wrapper.className = "nodehub-upland-link-field";
        }

        wrapper.appendChild(label);
        wrapper.appendChild(input);
        if (help) wrapper.appendChild(help);

        if (locationHelp && locationHelp.parentNode === form) {
            locationHelp.insertAdjacentElement("afterend", wrapper);
        } else if (locationInput && locationInput.parentNode === form) {
            locationInput.insertAdjacentElement("afterend", wrapper);
        } else {
            const submit = form.querySelector('button[type="submit"]');
            if (submit) form.insertBefore(wrapper, submit);
        }
    }

    function setupLoginRepair() {
        const form = document.getElementById("login-form");
        if (!form || form.dataset.nodehubLoginRepair === "true" || !authClient) return;

        form.dataset.nodehubLoginRepair = "true";

        form.addEventListener("submit", async function (event) {
            event.preventDefault();
            event.stopImmediatePropagation();

            const emailInput = document.getElementById("login-email");
            const passwordInput = document.getElementById("login-password");
            const button = form.querySelector('button[type="submit"]');

            const email = emailInput?.value.trim().toLowerCase() || "";
            const password = passwordInput?.value || "";

            if (!email || !password) {
                alert("Please enter your email and password.");
                return;
            }

            const originalText = button?.textContent || "Sign in";
            if (button) {
                button.disabled = true;
                button.textContent = "Signing in...";
            }

            try {
                const { data, error } = await authClient.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    console.error("Node Hub login error:", error);
                    alert(error.message || "Unable to sign in.");
                    return;
                }

                if (!data?.session || !data?.user) {
                    alert("Login could not be completed. Please try again.");
                    return;
                }

                window.location.hash = "dashboard";
            } catch (error) {
                console.error("Node Hub unexpected login error:", error);
                alert(error?.message || "Unable to sign in.");
            } finally {
                if (button) {
                    button.disabled = false;
                    button.textContent = originalText;
                }
            }
        }, true);
    }

    function boot() {
        setupLoginRepair();
        setDashboardView();
        ensureDashboardControls();
        moveUplandNodeLink();

        window.addEventListener("hashchange", function () {
            setTimeout(setDashboardView, 50);
            setTimeout(ensureDashboardControls, 100);
            setTimeout(moveUplandNodeLink, 100);
            setTimeout(setupLoginRepair, 100);
        });

        const observer = new MutationObserver(function () {
            setDashboardView();
            ensureDashboardControls();
            moveUplandNodeLink();
            setupLoginRepair();
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    const style = document.createElement("style");
    style.textContent = `
        body.nodehub-dashboard-mode {
            min-height: 100vh !important;
        }

        body.nodehub-dashboard-mode #nodehub-dashboard {
            display: block !important;
            min-height: 100vh;
        }

        body.nodehub-dashboard-mode .nodehub-dashboard-home-link {
            margin-top: 12px;
        }

        #nodehub-upland-link-field {
            display: block;
            width: 100%;
        }

        #nodehub-upland-link-field label,
        #nodehub-upland-link-field input,
        #nodehub-upland-link-field small {
            display: block;
            width: 100%;
        }
    `;
    document.head.appendChild(style);

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
