// =====================================================
// NODE HUB
// Public Node profile navigation
// Upland Node link registration support
// Live World Map information
// =====================================================

document.addEventListener("click", event => {
    const link = event.target.closest("a");
    if (link) return;
    const card = event.target.closest(".node-card");
    if (!card || !card.closest("#node-grid")) return;
    const nodeName = card.querySelector("h3")?.textContent?.trim();
    const list = Array.isArray(window.nodes) ? window.nodes : [];
    const node = list.find(item => (item.name || "").trim() === nodeName);
    if (node?.id) window.location.href = `node.html?id=${encodeURIComponent(node.id)}`;
});

// =====================================================
// UPLAND NODE LINK REGISTRATION
// =====================================================

function setupUplandNodeLink() {
    const form = document.getElementById("node-registration-form");
    if (!form || document.getElementById("node-upland-link")) return;
    const uplandLocation = document.getElementById("node-upland-location");
    if (!uplandLocation) return;

    const label = document.createElement("label");
    label.setAttribute("for", "node-upland-link");
    label.textContent = "Upland Node Link";

    const input = document.createElement("input");
    input.type = "url";
    input.id = "node-upland-link";
    input.placeholder = "https://play.upland.me/...";
    input.autocomplete = "url";

    const small = document.createElement("small");
    small.textContent = "Paste the direct Upland link to your Node. This helps us identify the exact location.";

    uplandLocation.insertAdjacentElement("afterend", small);
    small.insertAdjacentElement("afterend", label);
    label.insertAdjacentElement("afterend", input);
}

function setupUplandNodeSubmit() {
    const form = document.getElementById("node-registration-form");
    if (!form || form.dataset.uplandLinkHandler === "true") return;
    form.dataset.uplandLinkHandler = "true";

    form.addEventListener("submit", async event => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const user = typeof currentUser !== "undefined" ? currentUser : window.currentUser;
        if (!user) {
            alert("You must be signed in to register a Node.");
            window.location.hash = "login";
            return;
        }

        const get = id => document.getElementById(id)?.value.trim() || "";
        const name = get("node-name");
        const description = get("node-description");
        const city = get("node-city");
        const country = get("node-country");
        const uplandLocation = get("node-upland-location");
        const uplandNodeLink = get("node-upland-link");
        const continent = get("node-continent");
        const discord = get("node-discord");
        const twitter = get("node-twitter");
        const telegram = get("node-telegram");

        if (!name || !city || !country || !continent) {
            alert("Please complete Node Name, City, Country and Continent.");
            return;
        }

        if (uplandNodeLink) {
            try {
                const parsed = new URL(uplandNodeLink);
                if (!["https:", "http:"].includes(parsed.protocol)) throw new Error("Invalid protocol");
            } catch {
                alert("Please enter a valid Upland Node link.");
                return;
            }
        }

        const imageFile = document.getElementById("node-logo")?.files?.[0] || null;
        try {
            let logoURL = null;
            if (imageFile) {
                if (!imageFile.type.startsWith("image/") || imageFile.size > 5 * 1024 * 1024) {
                    alert("Please select an image smaller than 5 MB.");
                    return;
                }
                const extension = imageFile.name.includes(".") ? imageFile.name.split(".").pop().toLowerCase() : "jpg";
                const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${extension}`;
                const { error: uploadError } = await db.storage.from("node-images").upload(fileName, imageFile, {
                    cacheControl: "3600", upsert: false, contentType: imageFile.type
                });
                if (uploadError) {
                    alert("Could not upload the Node image: " + uploadError.message);
                    return;
                }
                logoURL = db.storage.from("node-images").getPublicUrl(fileName).data.publicUrl;
            }

            const { error } = await db.from("nodes").insert({
                user_id: user.id,
                name,
                description: description || null,
                city,
                country,
                upland_location: uplandLocation || null,
                upland_node_url: uplandNodeLink || null,
                continent,
                logo_url: logoURL,
                discord_url: discord || null,
                twitter_url: twitter || null,
                telegram_url: telegram || null,
                status: "pending"
            });

            if (error) {
                alert("Could not register the Node: " + error.message);
                return;
            }

            alert("Node submitted successfully! It will be reviewed by the Node Hub team.");
            form.reset();
            document.getElementById("node-image-preview")?.replaceChildren();
            if (typeof loadMyNodes === "function") await loadMyNodes();
            window.location.hash = "dashboard";
        } catch (error) {
            console.error("Unexpected Node registration error:", error);
            alert("Unable to submit the Node.");
        }
    }, true);
}

// =====================================================
// LIVE WORLD MAP
// =====================================================

async function initializeWorldMap() {
    const map = document.querySelector("#map .map-preview");
    if (!map || typeof db === "undefined") return;

    map.innerHTML = `
        <div class="node-map-live">
            <div class="node-map-toolbar">
                <span class="map-live-badge">● LIVE DIRECTORY</span>
                <strong id="map-node-total">Loading Nodes...</strong>
            </div>
            <div class="node-map-stats" id="map-node-stats"></div>
            <div class="node-map-content">
                <div class="node-map-visual" id="node-map-visual">
                    <div class="node-map-glow"></div>
                    <div class="node-map-caption">Node locations</div>
                </div>
                <div class="node-map-list" id="node-map-list"></div>
            </div>
        </div>`;

    try {
        const { data, error } = await db.from("nodes")
            .select("id,name,city,country,continent,upland_location,status")
            .eq("status", "approved")
            .order("name", { ascending: true });

        if (error) throw error;
        const approved = data || [];
        const total = approved.length;
        const continents = [...new Set(approved.map(n => n.continent).filter(Boolean))];
        const countries = [...new Set(approved.map(n => n.country).filter(Boolean))];

        document.getElementById("map-node-total").textContent = `${total} verified ${total === 1 ? "Node" : "Nodes"}`;
        document.getElementById("map-node-stats").innerHTML = `
            <span><b>${total}</b> Nodes</span>
            <span><b>${countries.length}</b> Countries</span>
            <span><b>${continents.length}</b> Continents</span>`;

        const list = document.getElementById("node-map-list");
        if (!approved.length) {
            list.innerHTML = `<div class="node-map-empty"><strong>No verified Nodes yet</strong><p>Approved Nodes will appear here automatically.</p></div>`;
            return;
        }

        const grouped = approved.reduce((acc, node) => {
            const key = node.continent || "Other";
            (acc[key] ||= []).push(node);
            return acc;
        }, {});

        list.innerHTML = Object.entries(grouped).map(([continent, continentNodes]) => `
            <div class="node-map-group">
                <div class="node-map-group-title"><span>${escapeMapHTML(continent)}</span><b>${continentNodes.length}</b></div>
                ${continentNodes.map(node => `
                    <a class="node-map-item" href="#node/${encodeURIComponent(node.id)}">
                        <span class="node-map-dot"></span>
                        <span class="node-map-item-main">
                            <strong>${escapeMapHTML(node.name || "Unnamed Node")}</strong>
                            <small>${escapeMapHTML([node.city, node.country].filter(Boolean).join(", ") || "Location not provided")}</small>
                            ${node.upland_location ? `<small>${escapeMapHTML(node.upland_location)}</small>` : ""}
                        </span>
                    </a>`).join("")}
            </div>`).join("");

        const visual = document.getElementById("node-map-visual");
        approved.forEach((node, index) => {
            const marker = document.createElement("a");
            marker.className = "node-map-marker";
            marker.href = `#node/${encodeURIComponent(node.id)}`;
            marker.title = node.name || "Node";
            marker.style.left = `${12 + ((index * 37) % 76)}%`;
            marker.style.top = `${18 + ((index * 53) % 60)}%`;
            marker.innerHTML = `<span></span><b>${escapeMapHTML(node.name || "Node")}</b>`;
            visual.appendChild(marker);
        });
    } catch (error) {
        console.error("World map error:", error);
        const total = document.getElementById("map-node-total");
        if (total) total.textContent = "Map temporarily unavailable";
    }
}

function escapeMapHTML(value) {
    return String(value ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
}

// =====================================================
// INITIALIZE
// =====================================================

function initializeUplandNodeLinkFeature() {
    setupUplandNodeLink();
    setupUplandNodeSubmit();
    initializeWorldMap();

    const observer = new MutationObserver(() => {
        const form = document.getElementById("node-registration-form");
        if (form) {
            setupUplandNodeLink();
            setupUplandNodeSubmit();
        }
    });
    observer.observe(document.body, { childList: true, subtree: true });
}

document.addEventListener("DOMContentLoaded", initializeUplandNodeLinkFeature);
