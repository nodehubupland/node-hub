/* Node Hub patch: logout + Upland Node Link */
(function () {
    "use strict";

    const SUPABASE_URL = "https://ynqtzyzxspoxssjrjeve.supabase.co";
    const SUPABASE_KEY = "sb_publishable_FoDbr9qgVeeIYfzEZNNN9Q_53aHxI2g";
    const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

    function escapeHTML(value) {
        return String(value ?? "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#039;");
    }

    function validURL(value) {
        try {
            const url = new URL(value);
            return url.protocol === "https:" || url.protocol === "http:";
        } catch (_) {
            return false;
        }
    }

    function injectLogout() {
        if (!window.location.hash.toLowerCase().includes("dashboard")) return;
        if (document.getElementById("nodehub-logout-button")) return;

        const nav = document.querySelector(".main-nav");
        if (nav) {
            const button = document.createElement("button");
            button.id = "nodehub-logout-button";
            button.type = "button";
            button.textContent = "Sign out";
            button.className = "button button-secondary nodehub-logout";
            button.addEventListener("click", async function () {
                button.disabled = true;
                const { error } = await client.auth.signOut();
                if (error) {
                    button.disabled = false;
                    alert(error.message);
                    return;
                }
                window.location.hash = "home";
                window.location.reload();
            });
            nav.appendChild(button);
        }
    }

    function injectUplandField() {
        const form = document.getElementById("node-registration-form");
        if (!form || document.getElementById("node-upland-url")) return;

        const anchor = document.getElementById("node-upland-location");
        const wrapper = document.createElement("div");
        wrapper.id = "nodehub-upland-link-field";
        wrapper.innerHTML = `
            <label for="node-upland-url">Upland Node Link</label>
            <input
                type="url"
                id="node-upland-url"
                name="upland_node_url"
                placeholder="https://play.upland.me/..."
                autocomplete="url"
            >
            <small>Paste the direct link to your Node property in Upland.</small>
        `;

        if (anchor && anchor.parentElement) {
            anchor.parentElement.insertAdjacentElement("afterend", wrapper);
        } else {
            const submit = form.querySelector("button[type='submit']");
            if (submit) submit.insertAdjacentElement("beforebegin", wrapper);
            else form.appendChild(wrapper);
        }
    }

    async function submitNodeWithUplandLink(event) {
        const form = event.target;
        if (!form || form.id !== "node-registration-form") return;
        if (!document.getElementById("node-upland-url")) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        const { data: { user }, error: sessionError } = await client.auth.getUser();
        if (sessionError || !user) {
            alert("You must be signed in to register a Node.");
            window.location.hash = "login";
            return;
        }

        const value = id => document.getElementById(id)?.value.trim() || "";
        const name = value("node-name");
        const description = value("node-description");
        const city = value("node-city");
        const country = value("node-country");
        const uplandLocation = value("node-upland-location");
        const continent = value("node-continent");
        const discord = value("node-discord");
        const twitter = value("node-twitter");
        const telegram = value("node-telegram");
        const uplandNodeURL = value("node-upland-url");
        const imageFile = document.getElementById("node-logo")?.files?.[0] || null;

        if (!name || !city || !country || !continent) {
            alert("Please complete Node Name, City, Country and Continent.");
            return;
        }

        if (uplandNodeURL && !validURL(uplandNodeURL)) {
            alert("Please enter a valid Upland Node Link.");
            return;
        }

        const submitButton = form.querySelector("button[type='submit']");
        const originalText = submitButton?.textContent || "Submit Node for Review";
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = "Submitting...";
        }

        try {
            let logoURL = null;

            if (imageFile) {
                if (!imageFile.type.startsWith("image/")) throw new Error("Please select a valid image.");
                if (imageFile.size > 5 * 1024 * 1024) throw new Error("The image must be smaller than 5 MB.");

                const extension = (imageFile.name.split(".").pop() || "jpg").toLowerCase();
                const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
                const { error: uploadError } = await client.storage
                    .from("node-images")
                    .upload(fileName, imageFile, {
                        cacheControl: "3600",
                        upsert: false,
                        contentType: imageFile.type
                    });

                if (uploadError) throw new Error(uploadError.message);

                logoURL = client.storage
                    .from("node-images")
                    .getPublicUrl(fileName).data.publicUrl;
            }

            const nodeData = {
                user_id: user.id,
                name,
                description: description || null,
                city,
                country,
                upland_location: uplandLocation || null,
                upland_node_url: uplandNodeURL || null,
                continent,
                logo_url: logoURL,
                discord_url: discord || null,
                twitter_url: twitter || null,
                telegram_url: telegram || null,
                status: "pending"
            };

            const { error } = await client.from("nodes").insert(nodeData);
            if (error) throw new Error(error.message);

            alert("Node submitted successfully! It will be reviewed by the Node Hub team.");
            form.reset();
            const preview = document.getElementById("node-image-preview");
            if (preview) preview.innerHTML = "";
            window.location.hash = "dashboard";
            window.location.reload();
        } catch (error) {
            console.error("Node registration error:", error);
            alert("Could not register the Node: " + error.message);
        } finally {
            if (submitButton) {
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        }
    }

    async function addUplandLinkToPublicProfile() {
        const hash = window.location.hash || "";
        if (!hash.toLowerCase().startsWith("#node/")) return;

        const nodeId = decodeURIComponent(hash.substring(6));
        if (!nodeId) return;

        const { data: node, error } = await client
            .from("nodes")
            .select("id,name,upland_node_url")
            .eq("id", nodeId)
            .eq("status", "approved")
            .maybeSingle();

        if (error || !node?.upland_node_url || !validURL(node.upland_node_url)) return;

        let attempts = 0;
        const timer = setInterval(() => {
            attempts++;
            if (document.getElementById("nodehub-upland-profile-link")) {
                clearInterval(timer);
                return;
            }

            const profile = document.querySelector(
                "#nodehub-node-profile, .node-profile, [id*='node-profile'], [class*='node-profile']"
            );

            if (!profile && attempts < 20) return;
            if (attempts >= 20) clearInterval(timer);

            const box = document.createElement("div");
            box.id = "nodehub-upland-profile-link";
            box.innerHTML = `
                <div class="auth-card" style="margin-top:24px;">
                    <span class="eyebrow">UPLAND</span>
                    <h3>Find this Node in Upland</h3>
                    <p>Open the direct property link for <strong>${escapeHTML(node.name)}</strong>.</p>
                    <a href="${escapeHTML(node.upland_node_url)}" target="_blank" rel="noopener noreferrer" class="button button-primary">
                        Open Node in Upland
                    </a>
                </div>
            `;

            if (profile) profile.appendChild(box);
            else document.body.appendChild(box);
            clearInterval(timer);
        }, 250);
    }

    function boot() {
        injectLogout();
        injectUplandField();
        addUplandLinkToPublicProfile();

        document.addEventListener("submit", submitNodeWithUplandLink, true);
        window.addEventListener("hashchange", function () {
            setTimeout(injectLogout, 50);
            setTimeout(injectUplandField, 50);
            setTimeout(addUplandLinkToPublicProfile, 100);
        });

        const observer = new MutationObserver(() => {
            injectLogout();
            injectUplandField();
        });
        observer.observe(document.body, { childList: true, subtree: true });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", boot, { once: true });
    } else {
        boot();
    }
})();
