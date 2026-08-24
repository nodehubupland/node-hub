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
        #node-upland-url { display: none !important; }
        label[for="node-upland-url"], #node-upland-url + small { display: none !important; }
        .account-profile-card { margin-bottom: 24px; }
        .account-profile-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:12px; margin-top:16px; }
        .account-profile-item { padding:14px 16px; border:1px solid rgba(255,255,255,.08); border-radius:12px; background:rgba(255,255,255,.025); }
        .account-profile-item small { display:block; opacity:.65; margin-bottom:5px; }
        @media (max-width:760px){ .account-profile-grid{grid-template-columns:1fr;} }
    `;
    document.head.appendChild(style);

    async function loadAccountProfile() {
        if (!currentUser) return;
        const dashboard = document.getElementById("nodehub-dashboard");
        if (!dashboard || document.getElementById("account-profile-card")) return;
        try {
            const { data: profile } = await db.from("profiles").select("username, role").eq("id", currentUser.id).maybeSingle();
            const username = profile?.username || currentUser.user_metadata?.username || currentUser.email?.split("@")[0] || "User";
            const role = profile?.role || "user";
            const card = document.createElement("div");
            card.id = "account-profile-card";
            card.className = "auth-card account-profile-card";
            card.innerHTML = `<span class="eyebrow" data-i18n="accountInfo">ACCOUNT INFORMATION</span><div class="account-profile-grid"><div class="account-profile-item"><small data-i18n="username">Username</small><strong>${escapeHTML(username)}</strong></div><div class="account-profile-item"><small data-i18n="email">Email</small><strong>${escapeHTML(currentUser.email || "")}</strong></div><div class="account-profile-item"><small data-i18n="function">Function</small><strong>${escapeHTML(role)}</strong></div></div>`;
            const heading = dashboard.querySelector(".section-heading");
            heading?.after(card);
            applyLanguagePreference();
        } catch (error) { console.warn("Account profile lookup failed:", error); }
    }

    const translations = {
        "pt-BR": {
            "NODE HUB ACCOUNT":"CONTA NODE HUB", "Dashboard":"Painel", "Manage your Node Hub account and Node submissions.":"Gerencie sua conta Node Hub e seus Nodes enviados.", "Sign out":"Sair", "YOUR NODES":"SEUS NODES", "My Nodes":"Meus Nodes", "NODE REGISTRATION":"CADASTRO DE NODE", "Register My Node":"Cadastrar Meu Node", "Node registration will be submitted for review by the Node Hub team.":"O cadastro será enviado para análise da equipe Node Hub.", "Submit Node for Review":"Enviar Node para Análise", "Cancel":"Cancelar", "ACCOUNT INFORMATION":"INFORMAÇÕES DA CONTA", "Username":"Nome de usuário", "Email":"E-mail", "Function":"Função", "Not signed in":"Não conectado", "Sign in":"Entrar", "Create an Account":"Criar uma Conta", "Explore Nodes":"Explorar Nodes", "Find Nodes Across Upland":"Encontre Nodes pelo Upland", "World Map":"Mapa Mundial", "About":"Sobre", "Support":"Suporte", "Nodes":"Nodes", "Map":"Mapa", "Roadmap":"Roadmap"
        }
    };

    function applyLanguagePreference() {
        const lang = localStorage.getItem("nodehub-language") || "en-US";
        document.documentElement.lang = lang;
        const map = translations[lang];
        if (!map) return;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);
        textNodes.forEach(node => {
            const value = node.nodeValue.trim();
            if (!value || !map[value]) return;
            node.nodeValue = node.nodeValue.replace(value, map[value]);
        });
        document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach(input => {
            if (map[input.placeholder]) input.placeholder = map[input.placeholder];
        });
    }

    // V1 database compatibility: the current nodes table does not contain upland_node_url.
    document.addEventListener("submit", async function (event) {
        const form = event.target;
        if (!form || form.id !== "node-registration-form") return;
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!currentUser) { window.location.hash = "login"; return; }
        const name = getValue("node-name");
        const description = getValue("node-description");
        const city = getValue("node-city");
        const country = getValue("node-country");
        const uplandLocation = getValue("node-upland-location");
        const continent = getValue("node-continent");
        const discord = getValue("node-discord");
        const twitter = getValue("node-twitter");
        const telegram = getValue("node-telegram");
        const imageFile = document.getElementById("node-logo")?.files?.[0] || null;
        const button = form.querySelector("button[type='submit']");
        if (!name || !city || !country || !continent) { alert("Please complete Node Name, City, Country and Continent."); return; }
        const originalText = button?.textContent || "Submit Node for Review";
        if (button) { button.disabled = true; button.textContent = "Submitting..."; }
        try {
            let logoURL = null;
            if (imageFile) {
                if (!imageFile.type.startsWith("image/") || imageFile.size > 5 * 1024 * 1024) { alert("Please select an image smaller than 5 MB."); return; }
                const extension = getFileExtension(imageFile.name);
                const fileName = `${currentUser.id}/${Date.now()}-${randomString(8)}.${extension}`;
                const { error: uploadError } = await db.storage.from("node-images").upload(fileName, imageFile, { cacheControl:"3600", upsert:false, contentType:imageFile.type });
                if (uploadError) { alert("Could not upload the Node image: " + uploadError.message); return; }
                logoURL = db.storage.from("node-images").getPublicUrl(fileName).data.publicUrl;
            }
            const payload = { user_id:currentUser.id, name, description:description || null, city, country, upland_location:uplandLocation || null, continent, logo_url:logoURL, discord_url:discord || null, twitter_url:twitter || null, telegram_url:telegram || null, status:"pending" };
            const { error } = await db.from("nodes").insert(payload);
            if (error) { console.error(error); alert("Could not register the Node: " + error.message); return; }
            alert("Node submitted successfully! It will be reviewed by the Node Hub team.");
            clearNodeForm(); await loadMyNodes(); window.location.hash = "dashboard";
        } catch (error) { console.error(error); alert("Unable to submit the Node. Please try again."); }
        finally { if (button) { button.disabled = false; button.textContent = originalText; } }
    }, true);

    document.addEventListener("DOMContentLoaded", function () {
        const uplandLabel = document.querySelector('label[for="node-upland-url"]');
        const uplandInput = document.getElementById("node-upland-url");
        const uplandHelp = uplandInput?.nextElementSibling;
        if (uplandLabel) uplandLabel.remove();
        if (uplandInput) uplandInput.remove();
        if (uplandHelp?.tagName === "SMALL") uplandHelp.remove();
        const selector = document.getElementById("language-selector");
        selector?.addEventListener("change", () => setTimeout(applyLanguagePreference, 0));
        setTimeout(() => { applyLanguagePreference(); loadAccountProfile(); }, 300);
        const observer = new MutationObserver(() => { loadAccountProfile(); });
        observer.observe(document.body, { childList:true, subtree:true });
    });

    const script = document.createElement("script");
    script.src = "directory-navigation.js?v=20260824";
    script.async = false;
    document.body.appendChild(script);
})();
