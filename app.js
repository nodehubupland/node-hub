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

document.addEventListener("DOMContentLoaded", () => {
    // Never block the public site on Supabase authentication.
    setupSearch();
    setupLanguage();
    setupAuthForms();
    setupLogout();
    setupNavigation();
    handleRoute();
    window.addEventListener("hashchange", handleRoute);

    // Public directory loads independently from authentication.
    setTimeout(() => loadNodes(), 0);

    // Authentication is background-only. A slow auth endpoint must not freeze V1.
    initializeAuth().catch(error => console.warn("Background authentication unavailable:", error));
});

async function initializeAuth() {
    try {
        const result = await Promise.race([
            db.auth.getSession(),
            new Promise(resolve => setTimeout(() => resolve({ data: { session: null }, error: new Error("Authentication timeout") }), 6000))
        ]);
        const { data, error } = result || {};
        if (error) console.warn("Session unavailable:", error.message);
        currentUser = data?.session?.user || null;
        updateAuthUI();
        db.auth.onAuthStateChange((event, session) => {
            currentUser = session ? session.user : null;
            updateAuthUI();
            if (event === "SIGNED_IN") setTimeout(() => { updateDashboard(); loadNodes(); handleRoute(); }, 0);
            if (event === "SIGNED_OUT") { removeDashboard(); removeNodeProfile(); setDashboardMode(false); }
        });
    } catch (error) { console.warn("Authentication initialization unavailable:", error); }
}

async function getCurrentRole() {
    if (!currentUser) return "user";
    try {
        const { data, error } = await db.from("profiles").select("role").eq("id", currentUser.id).maybeSingle();
        if (error) { console.warn("Role lookup failed:", error); return "user"; }
        return data?.role || "user";
    } catch (error) { return "user"; }
}

async function routeAuthenticatedUser() {
    if (!currentUser) { window.location.hash = "login"; return; }
    const role = await getCurrentRole();
    if (["owner", "admin", "moderator"].includes(role)) { window.location.href = "./admin.html"; return; }
    showDashboard();
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
    if (active) { if (header) header.style.display = "none"; sections.forEach(section => section.style.display = "none"); }
    else { if (header) header.style.display = ""; sections.forEach(section => section.style.display = ""); }
}

async function handleRoute() {
    const hash = window.location.hash.replace(/^#/, "").toLowerCase();
    if (hash.startsWith("node/")) { setDashboardMode(false); removeDashboard(); showNodeProfile(decodeURIComponent(hash.substring(5))); return; }
    removeNodeProfile();
    if (hash === "dashboard" || hash === "register") {
        if (!currentUser) { window.location.hash = "login"; return; }
        await routeAuthenticatedUser();
        if (hash === "register" && currentUser && !["owner", "admin", "moderator"].includes(await getCurrentRole())) setTimeout(() => document.getElementById("dashboard-node-form")?.scrollIntoView({ behavior: "smooth" }), 100);
        return;
    }
    setDashboardMode(false);
    if (hash === "login" && currentUser) await routeAuthenticatedUser();
}

function setupNavigation() {
    document.addEventListener("click", event => {
        const link = event.target.closest("a[href]");
        if (!link) return;
        const href = link.getAttribute("href");
        if (href === "#submit") { event.preventDefault(); window.location.hash = currentUser ? "register" : "login"; }
        if (href === "#login" && currentUser) { event.preventDefault(); window.location.hash = "dashboard"; }
    });
}

async function signUp() {
    const username = document.getElementById("signup-username")?.value.trim() || "";
    const email = document.getElementById("signup-email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("signup-password")?.value || "";
    if (!email || !password) { alert("Please enter your email and password."); return; }
    if (password.length < 8) { alert("Password must contain at least 8 characters."); return; }
    try { const { data, error } = await db.auth.signUp({ email, password, options: { emailRedirectTo: "https://nodehubupland.github.io/node-hub/", data: { username } } }); if (error) { alert(error.message); return; } if (data.user && data.session) { currentUser = data.user; await createProfile(username); updateAuthUI(); window.location.hash = "dashboard"; } else if (data.user) alert("Account created. Please check your email to confirm your account."); }
    catch (error) { console.error(error); alert("Unable to create your account."); }
}

async function createProfile(username) { if (!currentUser) return; try { await db.from("profiles").upsert({ id: currentUser.id, username: username || currentUser.email?.split("@")[0] || "User", email: currentUser.email }, { onConflict: "id" }); } catch (error) { console.warn("Profile creation error:", error); } }

async function signIn() {
    const email = document.getElementById("login-email")?.value.trim().toLowerCase() || "";
    const password = document.getElementById("login-password")?.value || "";
    const button = document.querySelector("#login-form button[type='submit']");
    if (!email || !password) { alert("Please enter your email and password."); return; }
    const original = button?.textContent || "Sign in";
    try { if (button) { button.disabled = true; button.textContent = "Signing in..."; } const { data, error } = await db.auth.signInWithPassword({ email, password }); if (error) { alert(error.message); return; } currentUser = data.user; updateAuthUI(); await routeAuthenticatedUser(); }
    catch (error) { console.error(error); alert("Unable to sign in."); }
    finally { if (button) { button.disabled = false; button.textContent = original; } }
}

async function signOut() { try { const { error } = await db.auth.signOut(); if (error) { alert(error.message); return; } currentUser = null; removeDashboard(); removeNodeProfile(); setDashboardMode(false); window.location.hash = "home"; location.reload(); } catch (error) { console.error(error); } }
function setupAuthForms() { const signup = document.getElementById("signup-form"); const login = document.getElementById("login-form"); if (signup) signup.addEventListener("submit", e => { e.preventDefault(); signUp(); }); if (login) login.addEventListener("submit", e => { e.preventDefault(); signIn(); }); }
function setupLogout() { document.addEventListener("click", event => { const button = event.target.closest("[data-action='logout']"); if (!button) return; event.preventDefault(); signOut(); }); }

async function loadNodes() {
    if (!nodeGrid) return;
    const loading = nodeGrid.querySelector(".empty-directory");
    if (loading) loading.querySelector("h3")?.replaceChildren(document.createTextNode("Loading Nodes..."));
    try {
        const result = await Promise.race([
            db.from("nodes").select("*").eq("status", "approved").order("created_at", { ascending: false }),
            new Promise(resolve => setTimeout(() => resolve({ data: null, error: new Error("Directory timeout") }), 8000))
        ]);
        const { data, error } = result || {};
        if (error) { console.error("Directory:", error); showDirectoryError(); return; }
        nodes = data || [];
        renderNodes(nodes);
    } catch (error) { console.error("Directory:", error); showDirectoryError(); }
}

function renderNodes(list) { if (!nodeGrid) return; nodeGrid.innerHTML = ""; if (nodeCount) nodeCount.textContent = `${list.length} ${list.length === 1 ? "Node" : "Nodes"}`; if (!list.length) { showEmptyDirectory(); return; } list.forEach(node => nodeGrid.appendChild(createNodeCard(node))); }
function createNodeCard(node) { const article = document.createElement("article"); article.className = "node-card"; const logo = node.logo_url || node.image_url || ""; const imageHTML = logo ? `<div class="node-card-image"><img src="${escapeHTML(logo)}" alt="" aria-hidden="true" loading="lazy"></div>` : `<div class="node-card-image node-card-placeholder">●</div>`; article.innerHTML = `${imageHTML}<div class="node-card-content"><h3>${escapeHTML(node.name || "Unnamed Node")}</h3><p class="node-location">${escapeHTML(node.city || "")}${node.country ? `, ${escapeHTML(node.country)}` : ""}</p>${node.upland_location ? `<p class="node-upland-location"><strong>Neighborhood:</strong> ${escapeHTML(node.upland_location)}</p>` : ""}<div class="node-links" style="justify-content:center;">${node.discord_url ? `<a href="${safeURL(node.discord_url)}" target="_blank" rel="noopener noreferrer">Discord</a>` : ""}${node.telegram_url ? `<a href="${safeURL(node.telegram_url)}" target="_blank" rel="noopener noreferrer">Telegram</a>` : ""}${node.twitter_url ? `<a href="${safeURL(node.twitter_url)}" target="_blank" rel="noopener noreferrer">X / Twitter</a>` : ""}</div><div style="text-align:center;margin-top:18px;"><a class="node-profile-link" href="#node/${encodeURIComponent(node.id)}" style="color:var(--accent-light);font-weight:800;text-decoration:underline;text-underline-offset:4px;">View Node Profile</a></div><div class="node-card-footer" style="justify-content:center;margin-top:16px;"><span class="verified-badge" style="display:inline-flex;align-items:center;justify-content:center;gap:6px;color:var(--accent-light);font-weight:800;">✓ Verified Node</span></div></div>`; return article; }
function showEmptyDirectory() { if (!nodeGrid) return; nodeGrid.innerHTML = `<div class="empty-directory"><div class="empty-icon">◉</div><h3>No Nodes listed yet</h3><p>Be one of the first Node administrators to register your Node.</p><a href="#submit" class="button button-primary">Submit a Node</a></div>`; if (nodeCount) nodeCount.textContent = "0 Nodes"; }
function showDirectoryError() { if (!nodeGrid) return; nodeGrid.innerHTML = `<div class="empty-directory"><div class="empty-icon">!</div><h3>Directory temporarily unavailable</h3><p>The Node directory is taking too long to respond. The rest of Node Hub remains available.</p><button class="button button-secondary" type="button" onclick="loadNodes()">Try again</button></div>`; }
function setupSearch() { if (searchInput) searchInput.addEventListener("input", filterNodes); if (continentFilter) continentFilter.addEventListener("change", filterNodes); }
function filterNodes() { const search = searchInput?.value.trim().toLowerCase() || ""; const continent = continentFilter?.value || ""; renderNodes(nodes.filter(node => { const text = [node.name, node.city, node.country, node.upland_location, node.description].filter(Boolean).join(" ").toLowerCase(); return (!search || text.includes(search)) && (!continent || node.continent === continent); })); }

async function showNodeProfile(nodeId) { removeNodeProfile(); const section = document.createElement("section"); section.id = "nodehub-node-profile"; section.className = "section section-alt"; section.innerHTML = `<div class="container"><div class="auth-card"><span class="eyebrow">NODE PROFILE</span><h2>Loading Node...</h2><p>Loading verified Node information.</p></div></div>`; document.body.appendChild(section); section.scrollIntoView({ behavior: "smooth" }); try { const { data: node, error } = await db.from("nodes").select("*").eq("id", nodeId).eq("status", "approved").maybeSingle(); if (error || !node) { section.innerHTML = `<div class="container"><div class="auth-card"><h2>Node not found</h2><p>This Node is unavailable or has not been approved.</p><a href="#nodes" class="button button-primary">Back to Nodes</a></div></div>`; return; } const logo = node.logo_url || node.image_url || ""; section.innerHTML = `<div class="container"><div class="auth-card" style="text-align:center;max-width:900px;margin:0 auto;">${logo ? `<img src="${escapeHTML(logo)}" alt="" aria-hidden="true" style="display:block;width:min(280px,100%);max-height:280px;object-fit:contain;margin:0 auto 24px;">` : ""}<span class="eyebrow">VERIFIED NODE</span><h2>${escapeHTML(node.name)}</h2><p>${escapeHTML(node.city || "")}${node.country ? `, ${escapeHTML(node.country)}` : ""}</p>${node.upland_location ? `<p><strong>Neighborhood:</strong> ${escapeHTML(node.upland_location)}</p>` : ""}${node.description ? `<p>${escapeHTML(node.description)}</p>` : ""}<div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-top:22px;">${node.upland_node_url ? `<a class="button button-primary" href="${safeURL(node.upland_node_url)}" target="_blank" rel="noopener noreferrer">Open Node in Upland</a>` : ""}${node.discord_url ? `<a class="button button-secondary" href="${safeURL(node.discord_url)}" target="_blank" rel="noopener noreferrer">Discord</a>` : ""}${node.telegram_url ? `<a class="button button-secondary" href="${safeURL(node.telegram_url)}" target="_blank" rel="noopener noreferrer">Telegram</a>` : ""}${node.twitter_url ? `<a class="button button-secondary" href="${safeURL(node.twitter_url)}" target="_blank" rel="noopener noreferrer">X / Twitter</a>` : ""}</div><div style="margin-top:24px;"><a href="#nodes">← Back to Nodes</a></div></div></div>`; } catch (error) { console.error(error); section.innerHTML = `<div class="container"><div class="auth-card"><h2>Unable to load Node</h2><p>Please try again.</p><a href="#nodes" class="button button-primary">Back to Nodes</a></div></div>`; } }
function removeNodeProfile() { document.getElementById("nodehub-node-profile")?.remove(); }