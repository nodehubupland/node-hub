// =====================================================
// NODE HUB
// Supabase + Authentication + Dashboard + Node Upload
// Public Node Profiles + Upland Node Link
// =====================================================

const SUPABASE_URL = "https://ynqtzyzxspoxssjrjeve.supabase.co";
const SUPABASE_KEY = "sb_publishable_FoDbr9qgVeeIYfzEZNNN9Q_53aHxI2g";
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_KEY);

let currentUser = null;
let nodes = [];

const nodeGrid = document.getElementById("node-grid");
const nodeCount = document.getElementById("node-count");
const searchInput = document.getElementById("node-search");
const continentFilter = document.getElementById("continent-filter");

document.addEventListener("DOMContentLoaded", async () => {
    await initializeAuth();
    setupSearch();
    setupLanguage();
    setupAuthForms();
    setupLogout();
    setupNavigation();
    handleRoute();
    window.addEventListener("hashchange", handleRoute);
    setTimeout(loadNodes, 0);
});

async function initializeAuth() {
    try {
        const { data, error } = await db.auth.getSession();
        if (error) { console.error("Session error:", error); return; }
        currentUser = data.session ? data.session.user : null;
        updateAuthUI();
        db.auth.onAuthStateChange((event, session) => {
            currentUser = session ? session.user : null;
            updateAuthUI();
            if (event === "SIGNED_IN") setTimeout(() => { updateDashboard(); loadNodes(); handleRoute(); }, 0);
            if (event === "SIGNED_OUT") { removeDashboard(); removeNodeProfile(); setDashboardMode(false); }
        });
    } catch (error) { console.error("Authentication initialization error:", error); }
}

function updateAuthUI() {
    const authNavText = document.getElementById("auth-nav-text");
    if (authNavText) authNavText.textContent = currentUser ? "Dashboard" : "Sign in";
    const accountStatus = document.getElementById("account-status");
    if (accountStatus) accountStatus.textContent = currentUser ? (currentUser.email || "Signed in") : "Not signed in";
    const logout = document.getElementById("dashboard-logout-button");
    if (logout) logout.style.display = currentUser ? "inline-flex" : "none";
}

function setDashboardMode(active) {
    const header = document.querySelector(".site-header");
    const sections = document.querySelectorAll("main > section");
    if (active) {
        if (header) header.style.display = "none";
        sections.forEach(section => section.style.display = "none");
    } else {
        if (header) header.style.display = "";
        sections.forEach(section => section.style.display = "");
    }
}

function handleRoute() {
    const hash = window.location.hash.replace(/^#/, "").toLowerCase();
    if (hash.startsWith("node/")) {
        setDashboardMode(false);
        removeDashboard();
        showNodeProfile(decodeURIComponent(hash.substring(5)));
        return;
    }
    removeNodeProfile();
    if (hash === "dashboard" || hash === "register") {
        if (!currentUser) { window.location.hash = "login"; return; }
        showDashboard();
        if (hash === "register") setTimeout(() => document.getElementById("dashboard-node-form")?.scrollIntoView({ behavior: "smooth" }), 100);
        return;
    }
    setDashboardMode(false);
    if (hash === "login" && currentUser) window.location.hash = "dashboard";
}

function setupNavigation() {
    document.addEventListener("click", event => {
        const link = event.target.closest("a[href]");
        if (!link) return;
        const href = link.getAttribute("href");
        if (href === "#submit") {
            event.preventDefault();
            window.location.hash = currentUser ? "register" : "login";
        }
        if (href === "#login" && currentUser) {
            event.preventDefault();
            window.location.hash = "dashboard";
        }
    });
}

async function signUp() {
    const username = document.getElementById("signup-username")?.value.trim() || "";
    const email = document.getElementById("signup-email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("signup-password")?.value || "";
    if (!email || !password) { alert("Please enter your email and password."); return; }
    if (password.length < 8) { alert("Password must contain at least 8 characters."); return; }
    try {
        const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: "https://nodehubupland.github.io/node-hub/", data: { username } } });
        if (error) { alert(error.message); return; }
        if (data.user && data.session) {
            currentUser = data.user;
            await createProfile(username);
            updateAuthUI();
            window.location.hash = "dashboard";
        } else if (data.user) alert("Account created. Please check your email to confirm your account.");
    } catch (error) { console.error(error); alert("Unable to create your account."); }
}

async function createProfile(username) {
    if (!currentUser) return;
    try {
        await db.from("profiles").upsert({ id: currentUser.id, username: username || currentUser.email?.split("@")[0] || "User", email: currentUser.email }, { onConflict: "id" });
    } catch (error) { console.warn("Profile creation error:", error); }
}

async function signIn() {
    const email = document.getElementById("login-email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("login-password")?.value || "";
    const button = document.querySelector("#login-form button[type='submit']");
    if (!email || !password) { alert("Please enter your email and password."); return; }
    const original = button?.textContent || "Sign in";
    try {
        if (button) { button.disabled = true; button.textContent = "Signing in..."; }
        const { data, error } = await db.auth.signInWithPassword({ email, password });
        if (error) { alert(error.message); return; }
        currentUser = data.user;
        updateAuthUI();
        window.location.hash = "dashboard";
    } catch (error) { console.error(error); alert("Unable to sign in."); }
    finally { if (button) { button.disabled = false; button.textContent = original; } }
}

async function signOut() {
    try {
        const { error } = await db.auth.signOut();
        if (error) { alert(error.message); return; }
        currentUser = null;
        removeDashboard();
        removeNodeProfile();
        setDashboardMode(false);
        window.location.hash = "home";
        location.reload();
    } catch (error) { console.error(error); }
}

function setupAuthForms() {
    const signup = document.getElementById("signup-form");
    const login = document.getElementById("login-form");
    if (signup) signup.addEventListener("submit", e => { e.preventDefault(); signUp(); });
    if (login) login.addEventListener("submit", e => { e.preventDefault(); signIn(); });
}

function setupLogout() {
    document.addEventListener("click", event => {
        const button = event.target.closest("[data-action='logout']");
        if (!button) return;
        event.preventDefault();
        signOut();
    });
}

async function loadNodes() {
    try {
        const { data, error } = await db.from("nodes").select("*").eq("status", "approved").order("created_at", { ascending: false });
        if (error) { console.error(error); showEmptyDirectory(); return; }
        nodes = data || [];
        renderNodes(nodes);
    } catch (error) { console.error(error); showEmptyDirectory(); }
}

function renderNodes(list) {
    if (!nodeGrid) return;
    nodeGrid.innerHTML = "";
    if (nodeCount) nodeCount.textContent = `${list.length} ${list.length === 1 ? "Node" : "Nodes"}`;
    if (!list.length) { showEmptyDirectory(); return; }
    list.forEach(node => nodeGrid.appendChild(createNodeCard(node)));
}

function createNodeCard(node) {
    const article = document.createElement("article");
    article.className = "node-card";
    const logo = node.logo_url || node.image_url || "";
    const imageHTML = logo
        ? `<div class="node-card-image"><img src="${escapeHTML(logo)}" alt="" aria-hidden="true" loading="lazy"></div>`
        : `<div class="node-card-image node-card-placeholder">●</div>`;

    article.innerHTML = `
        ${imageHTML}
        <div class="node-card-content">
            <h3>${escapeHTML(node.name || "Unnamed Node")}</h3>
            <p class="node-location">${escapeHTML(node.city || "")}${node.country ? `, ${escapeHTML(node.country)}` : ""}</p>
            ${node.upland_location ? `<p class="node-upland-location"><strong>Neighborhood:</strong> ${escapeHTML(node.upland_location)}</p>` : ""}
            <div class="node-links" style="justify-content:center;">
                ${node.discord_url ? `<a href="${safeURL(node.discord_url)}" target="_blank" rel="noopener noreferrer">Discord</a>` : ""}
                ${node.telegram_url ? `<a href="${safeURL(node.telegram_url)}" target="_blank" rel="noopener noreferrer">Telegram</a>` : ""}
                ${node.twitter_url ? `<a href="${safeURL(node.twitter_url)}" target="_blank" rel="noopener noreferrer">X / Twitter</a>` : ""}
            </div>
            <div style="text-align:center;margin-top:18px;">
                <a class="node-profile-link" href="#node/${encodeURIComponent(node.id)}" style="color:var(--accent-light);font-weight:800;text-decoration:underline;text-underline-offset:4px;">View Node Profile</a>
            </div>
            <div class="node-card-footer" style="justify-content:center;margin-top:16px;">
                <span class="verified-badge" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;color:var(--accent-light);font-weight:800;">✓ Verified Node</span>
            </div>
        </div>`;
    return article;
}

function showEmptyDirectory() {
    if (!nodeGrid) return;
    nodeGrid.innerHTML = `<div class="empty-directory"><div class="empty-icon">◉</div><h3>No Nodes listed yet</h3><p>Be one of the first Node administrators to register your Node.</p><a href="#submit" class="button button-primary">Submit a Node</a></div>`;
    if (nodeCount) nodeCount.textContent = "0 Nodes";
}

function setupSearch() {
    if (searchInput) searchInput.addEventListener("input", filterNodes);
    if (continentFilter) continentFilter.addEventListener("change", filterNodes);
}

function filterNodes() {
    const search = searchInput?.value.trim().toLowerCase() || "";
    const continent = continentFilter?.value || "";
    renderNodes(nodes.filter(node => {
        const text = [node.name, node.city, node.country, node.upland_location, node.description].filter(Boolean).join(" ").toLowerCase();
        return (!search || text.includes(search)) && (!continent || node.continent === continent);
    }));
}

async function showNodeProfile(nodeId) {
    removeNodeProfile();
    const section = document.createElement("section");
    section.id = "nodehub-node-profile";
    section.className = "section section-alt";
    section.innerHTML = `<div class="container"><div class="auth-card"><span class="eyebrow">NODE PROFILE</span><h2>Loading Node...</h2><p>Loading verified Node information.</p></div></div>`;
    document.body.appendChild(section);
    section.scrollIntoView({ behavior: "smooth" });
    try {
        const { data: node, error } = await db.from("nodes").select("*").eq("id", nodeId).eq("status", "approved").maybeSingle();
        if (error || !node) {
            section.innerHTML = `<div class="container"><div class="auth-card"><h2>Node not found</h2><p>This Node is unavailable or has not been approved.</p><a href="#nodes" class="button button-primary">Back to Nodes</a></div></div>`;
            return;
        }
        const logo = node.logo_url || node.image_url || "";
        section.innerHTML = `<div class="container"><div class="auth-card" style="text-align:center;max-width:900px;margin:0 auto;">
            ${logo ? `<img src="${escapeHTML(logo)}" alt="" aria-hidden="true" style="display:block;width:min(280px,100%);max-height:280px;object-fit:contain;margin:0 auto 24px;">` : ""}
            <span class="eyebrow">VERIFIED NODE</span>
            <h2>${escapeHTML(node.name)}</h2>
            <p>${escapeHTML(node.city || "")}${node.country ? `, ${escapeHTML(node.country)}` : ""}</p>
            ${node.upland_location ? `<p><strong>Neighborhood:</strong> ${escapeHTML(node.upland_location)}</p>` : ""}
            ${node.description ? `<p>${escapeHTML(node.description)}</p>` : ""}
            <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:22px;">
                ${node.upland_node_url ? `<a class="button button-primary" href="${safeURL(node.upland_node_url)}" target="_blank" rel="noopener noreferrer">Open Node in Upland</a>` : ""}
                ${node.discord_url ? `<a class="button button-secondary" href="${safeURL(node.discord_url)}" target="_blank" rel="noopener noreferrer">Discord</a>` : ""}
                ${node.telegram_url ? `<a class="button button-secondary" href="${safeURL(node.telegram_url)}" target="_blank" rel="noopener noreferrer">Telegram</a>` : ""}
                ${node.twitter_url ? `<a class="button button-secondary" href="${safeURL(node.twitter_url)}" target="_blank" rel="noopener noreferrer">X / Twitter</a>` : ""}
            </div>
            <div style="margin-top:24px;"><a href="#nodes">← Back to Nodes</a></div>
        </div></div>`;
    } catch (error) {
        console.error(error);
        section.innerHTML = `<div class="container"><div class="auth-card"><h2>Unable to load Node</h2><p>Please try again.</p><a href="#nodes" class="button button-primary">Back to Nodes</a></div></div>`;
    }
}

function removeNodeProfile() { document.getElementById("nodehub-node-profile")?.remove(); }

async function showDashboard() {
    if (!currentUser) { window.location.hash = "login"; return; }
    setDashboardMode(true);
    let dashboard = document.getElementById("nodehub-dashboard");
    if (!dashboard) { dashboard = createDashboard(); document.body.appendChild(dashboard); }
    dashboard.style.display = "block";
    dashboard.scrollIntoView({ behavior: "smooth" });
    await updateDashboard();
}

function createDashboard() {
    const section = document.createElement("section");
    section.id = "nodehub-dashboard";
    section.className = "section section-alt";
    section.innerHTML = `<div class="container">
        <div class="section-heading"><span class="eyebrow">NODE HUB ACCOUNT</span><h2>Dashboard</h2><p>Manage your Node Hub account and Node submissions.</p><button type="button" id="dashboard-logout-button" data-action="logout" class="button button-secondary">Sign out</button></div>
        <div class="auth-card"><span class="eyebrow">YOUR NODES</span><h3>My Nodes</h3><div id="my-nodes">Loading your Nodes...</div></div>
        <div id="dashboard-node-form" class="auth-card"><span class="eyebrow">NODE REGISTRATION</span><h3>Register My Node</h3><p>Node registration will be submitted for review by the Node Hub team.</p>
        <form id="node-registration-form">
            <label for="node-name">Node Name</label><input type="text" id="node-name" required placeholder="Node name">
            <label for="node-description">Description</label><textarea id="node-description" rows="4" placeholder="Tell us about your Node"></textarea>
            <label for="node-city">City</label><input type="text" id="node-city" required placeholder="City">
            <label for="node-country">Country</label><input type="text" id="node-country" required placeholder="Country">
            <label for="node-upland-location">Neighborhood</label><input type="text" id="node-upland-location" placeholder="Example: Porto, Chicago"><small>Enter the Neighborhood where your Node is located in Upland.</small>
            <label for="node-upland-url">Upland Node Link</label><input type="url" id="node-upland-url" name="upland_node_url" placeholder="https://play.upland.me/..."><small>Paste the direct link to the Node property in Upland.</small>
            <label for="node-continent">Continent</label><select id="node-continent" required><option value="">Select continent</option><option value="North America">North America</option><option value="South America">South America</option><option value="Europe">Europe</option><option value="Asia">Asia</option><option value="Africa">Africa</option><option value="Oceania">Oceania</option></select>
            <label for="node-logo">Node Logo</label><input type="file" id="node-logo" accept="image/png,image/jpeg,image/webp"><small>PNG, JPG or WEBP. Maximum 5 MB.</small><div id="node-image-preview"></div>
            <label for="node-discord">Discord</label><input type="url" id="node-discord" placeholder="https://discord.gg/...">
            <label for="node-twitter">X / Twitter</label><input type="url" id="node-twitter" placeholder="https://x.com/...">
            <label for="node-telegram">Telegram</label><input type="url" id="node-telegram" placeholder="https://t.me/...">
            <button type="submit" class="button button-primary">Submit Node for Review</button>
            <button type="button" id="cancel-node-registration" class="button button-secondary">Cancel</button>
        </form></div></div>`;
    setTimeout(setupNodeRegistration, 0);
    return section;
}

async function updateDashboard() {
    if (!currentUser) return;
    const email = document.getElementById("dashboard-email");
    if (email) email.textContent = currentUser.email || "";
    await loadMyNodes();
}

async function loadMyNodes() {
    const container = document.getElementById("my-nodes");
    if (!container) return;
    if (!currentUser) { container.textContent = "Please sign in."; return; }
    try {
        const { data, error } = await db.from("nodes").select("*").eq("user_id", currentUser.id).order("created_at", { ascending: false });
        if (error) { container.innerHTML = "<p>Unable to load your Nodes.</p>"; return; }
        if (!data?.length) { container.innerHTML = "<p>No Nodes registered yet.</p><p>Use Register My Node to submit your first Node.</p>"; return; }
        container.innerHTML = data.map(node => `<div class="node-card"><div class="node-card-content"><h3>${escapeHTML(node.name || "Unnamed Node")}</h3><p>${escapeHTML(node.city || "")}, ${escapeHTML(node.country || "")}</p>${node.upland_location ? `<p><strong>Neighborhood:</strong> ${escapeHTML(node.upland_location)}</p>` : ""}${node.upland_node_url ? `<p><strong>Upland Node Link:</strong> <a href="${safeURL(node.upland_node_url)}" target="_blank" rel="noopener noreferrer">Open</a></p>` : ""}<p>Status: <strong>${escapeHTML(node.status || "pending")}</strong></p></div></div>`).join("");
    } catch (error) { console.error(error); }
}

function setupNodeRegistration() {
    const form = document.getElementById("node-registration-form");
    if (!form || form.dataset.ready === "1") return;
    form.dataset.ready = "1";
    document.getElementById("node-logo")?.addEventListener("change", previewNodeImage);
    form.addEventListener("submit", e => { e.preventDefault(); submitNode(); });
    document.getElementById("cancel-node-registration")?.addEventListener("click", () => window.location.hash = "home");
}

function previewNodeImage(event) {
    const file = event.target.files?.[0];
    const preview = document.getElementById("node-image-preview");
    if (!preview) return;
    preview.innerHTML = "";
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 5 * 1024 * 1024) { alert("Please select an image smaller than 5 MB."); event.target.value = ""; return; }
    const image = document.createElement("img");
    image.src = URL.createObjectURL(file);
    image.style.cssText = "max-width:250px;max-height:250px;margin-top:15px;object-fit:contain;";
    preview.appendChild(image);
}

async function submitNode() {
    if (!currentUser) { window.location.hash = "login"; return; }
    const name = getValue("node-name");
    const description = getValue("node-description");
    const city = getValue("node-city");
    const country = getValue("node-country");
    const uplandLocation = getValue("node-upland-location");
    const uplandNodeURL = getValue("node-upland-url");
    const continent = getValue("node-continent");
    const discord = getValue("node-discord");
    const twitter = getValue("node-twitter");
    const telegram = getValue("node-telegram");
    if (!name || !city || !country || !continent) { alert("Please complete Node Name, City, Country and Continent."); return; }
    const imageFile = document.getElementById("node-logo")?.files?.[0] || null;
    try {
        let logoURL = null;
        if (imageFile) {
            if (!imageFile.type.startsWith("image/") || imageFile.size > 5 * 1024 * 1024) { alert("Please select an image smaller than 5 MB."); return; }
            const extension = getFileExtension(imageFile.name);
            const fileName = `${currentUser.id}/${Date.now()}-${randomString(8)}.${extension}`;
            const { error: uploadError } = await db.storage.from("node-images").upload(fileName, imageFile, { cacheControl: "3600", upsert: false, contentType: imageFile.type });
            if (uploadError) { alert("Could not upload the Node image: " + uploadError.message); return; }
            logoURL = db.storage.from("node-images").getPublicUrl(fileName).data.publicUrl;
        }
        const { error } = await db.from("nodes").insert({ user_id: currentUser.id, name, description: description || null, city, country, upland_location: uplandLocation || null, upland_node_url: uplandNodeURL || null, continent, logo_url: logoURL, discord_url: discord || null, twitter_url: twitter || null, telegram_url: telegram || null, status: "pending" });
        if (error) { alert("Could not register the Node: " + error.message); return; }
        alert("Node submitted successfully! It will be reviewed by the Node Hub team.");
        clearNodeForm();
        await loadMyNodes();
        window.location.hash = "dashboard";
    } catch (error) { console.error(error); alert("Unable to submit the Node."); }
}

function clearNodeForm() { document.getElementById("node-registration-form")?.reset(); const preview = document.getElementById("node-image-preview"); if (preview) preview.innerHTML = ""; }
function removeDashboard() { document.getElementById("nodehub-dashboard")?.remove(); }

function setupLanguage() {
    const selector = document.getElementById("language-selector");
    if (!selector) return;
    const saved = localStorage.getItem("nodehub-language");
    if (saved) selector.value = saved;
    selector.addEventListener("change", () => localStorage.setItem("nodehub-language", selector.value));
}

function getValue(id) { return document.getElementById(id)?.value.trim() || ""; }
function getFileExtension(fileName) { const parts = fileName.split("."); return parts.length > 1 ? parts.pop().toLowerCase() : "jpg"; }
function randomString(length) { const chars = "abcdefghijklmnopqrstuvwxyz0123456789"; return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join(""); }
function escapeHTML(value) { if (value === null || value === undefined) return ""; return String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;"); }
function safeURL(url) { try { const parsed = new URL(url); return parsed.protocol === "https:" || parsed.protocol === "http:" ? escapeHTML(parsed.href) : "#"; } catch { return "#"; } }
