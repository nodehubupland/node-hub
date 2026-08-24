// Node Hub V1 patch loader
(function () {
    if (window.__NODEHUB_V1_PATCH__) return;
    window.__NODEHUB_V1_PATCH__ = true;

    // app.js calls setupLanguage() during startup. Keep that call harmless and
    // let the centralized V1 language system own the actual language handling.
    window.setupLanguage = window.setupLanguage || function () {};

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

        .node-card .node-card-image {
            width: calc(100% + 56px);
            height: 240px;
            min-height: 240px;
            margin: -28px -28px 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
            background: #0d0d0d;
            border-bottom: 1px solid var(--border);
        }
        .node-card .node-card-image img {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: contain;
            padding: 18px;
        }
        .node-card .node-card-placeholder { color: var(--accent-light); font-size: 34px; }
        .hero.section { min-height: auto; padding-top: 92px; padding-bottom: 92px; }
        @media (max-width:760px) {
            .hero.section { padding-top: 68px; padding-bottom: 68px; }
            .node-card .node-card-image { height: 210px; min-height: 210px; margin: -28px -28px 22px; width: calc(100% + 56px); }
            .node-card .node-card-image img { padding: 16px; }
        }
    `;
    document.head.appendChild(style);

    async function loadAccountProfile() {
        if (!currentUser) return;
        const dashboard = document.getElementById("nodehub-dashboard");
        if (!dashboard || dashboard.querySelector("#account-profile-card")) return;
        try {
            const { data: profile, error } = await db.from("profiles").select("username, role").eq("id", currentUser.id).maybeSingle();
            if (error) console.warn("Profile lookup:", error.message);
            const username = profile?.username || currentUser.user_metadata?.username || currentUser.email?.split("@")[0] || "User";
            const role = profile?.role || "user";
            const card = document.createElement("div");
            card.id = "account-profile-card";
            card.className = "auth-card account-profile-card";
            card.innerHTML = `<span class="eyebrow" data-i18n="accountInfo">ACCOUNT INFORMATION</span><div class="account-profile-grid"><div class="account-profile-item"><small data-i18n="username">Username</small><strong>${escapeHTML(username)}</strong></div><div class="account-profile-item"><small data-i18n="email">Email</small><strong>${escapeHTML(currentUser.email || "")}</strong></div><div class="account-profile-item"><small data-i18n="function">Function</small><strong>${escapeHTML(role)}</strong></div></div>`;
            const heading = dashboard.querySelector(".section-heading");
            heading?.after(card);
            window.applyNodeHubLanguage?.();
        } catch (error) { console.warn("Account profile lookup failed:", error); }
    }

    const translations = {
        "pt-BR": {
            "NODE HUB ACCOUNT":"CONTA NODE HUB", "Dashboard":"Painel", "Manage your Node Hub account and Node submissions.":"Gerencie sua conta Node Hub e seus Nodes enviados.", "Sign out":"Sair", "YOUR NODES":"SEUS NODES", "My Nodes":"Meus Nodes", "NODE REGISTRATION":"CADASTRO DE NODE", "Register My Node":"Cadastrar Meu Node", "Node registration will be submitted for review by the Node Hub team.":"O cadastro será enviado para análise da equipe Node Hub.", "Submit Node for Review":"Enviar Node para Análise", "Cancel":"Cancelar", "ACCOUNT INFORMATION":"INFORMAÇÕES DA CONTA", "Username":"Nome de usuário", "Email":"E-mail", "Function":"Função", "No Nodes registered yet.":"Nenhum Node cadastrado ainda.", "Use Register My Node to submit your first Node.":"Use Cadastrar Meu Node para enviar seu primeiro Node.", "Node Name":"Nome do Node", "Description":"Descrição", "City":"Cidade", "Country":"País", "Neighborhood":"Bairro", "Enter the Neighborhood where your Node is located in Upland.":"Informe o bairro onde seu Node está localizado no Upland.", "Continent":"Continente", "Select continent":"Selecione o continente", "North America":"América do Norte", "South America":"América do Sul", "Europe":"Europa", "Asia":"Ásia", "Africa":"África", "Oceania":"Oceania", "Node Logo":"Logo do Node", "Discord":"Discord", "Telegram":"Telegram", "X / Twitter":"X / Twitter", "Not signed in":"Não conectado", "Sign in":"Entrar", "Create an Account":"Criar uma Conta", "Explore Nodes":"Explorar Nodes", "Find Nodes Across Upland":"Encontre Nodes pelo Upland", "World Map":"Mapa Mundial", "About":"Sobre", "Support":"Suporte", "Nodes":"Nodes", "Map":"Mapa", "Roadmap":"Roadmap"
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
        textNodes.forEach(node => { const value = node.nodeValue.trim(); if (value && map[value]) node.nodeValue = node.nodeValue.replace(value, map[value]); });
        document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach(input => { if (map[input.placeholder]) input.placeholder = map[input.placeholder]; });
    }

    document.addEventListener("submit", async function (event) {
        const form = event.target;
        if (!form || form.id !== "node-registration-form") return;
        event.preventDefault(); event.stopImmediatePropagation();
        if (!currentUser) { window.location.hash = "login"; return; }
        const getValue = id => document.getElementById(id)?.value.trim() || "";
        const name=getValue("node-name"), description=getValue("node-description"), city=getValue("node-city"), country=getValue("node-country"), uplandLocation=getValue("node-upland-location"), continent=getValue("node-continent"), discord=getValue("node-discord"), twitter=getValue("node-twitter"), telegram=getValue("node-telegram");
        const imageFile=document.getElementById("node-logo")?.files?.[0]||null;
        if(!name||!city||!country||!continent){alert("Please complete Node Name, City, Country and Continent.");return;}
        const button=form.querySelector("button[type='submit']"), originalText=button?.textContent||"Submit Node for Review";
        if(button){button.disabled=true;button.textContent="Submitting...";}
        try{
            let logoURL=null;
            if(imageFile){if(!imageFile.type.startsWith("image/")||imageFile.size>5*1024*1024){alert("Please select an image smaller than 5 MB.");return;}const extension=getFileExtension(imageFile.name);const fileName=`${currentUser.id}/${Date.now()}-${randomString(8)}.${extension}`;const{error:uploadError}=await db.storage.from("node-images").upload(fileName,imageFile,{cacheControl:"3600",upsert:false,contentType:imageFile.type});if(uploadError){alert("Could not upload the Node image: "+uploadError.message);return;}logoURL=db.storage.from("node-images").getPublicUrl(fileName).data.publicUrl;}
            const payload={user_id:currentUser.id,name,description:description||null,city,country,upland_location:uplandLocation||null,continent,logo_url:logoURL,discord_url:discord||null,twitter_url:twitter||null,telegram_url:telegram||null,status:"pending"};
            const{error}=await db.from("nodes").insert(payload);if(error){alert("Could not register the Node: "+error.message);return;}alert("Node submitted successfully! It will be reviewed by the Node Hub team.");clearNodeForm();await loadMyNodes();window.location.hash="dashboard";
        }catch(error){console.error(error);alert("Unable to submit the Node. Please try again.");}finally{if(button){button.disabled=false;button.textContent=originalText;}}
    },true);

    document.addEventListener("DOMContentLoaded", function () {
        const uplandLabel=document.querySelector('label[for="node-upland-url"]'), uplandInput=document.getElementById("node-upland-url"), uplandHelp=uplandInput?.nextElementSibling;
        if(uplandLabel)uplandLabel.remove();if(uplandInput)uplandInput.remove();if(uplandHelp?.tagName==="SMALL")uplandHelp.remove();
        const selector=document.getElementById("language-selector");selector?.addEventListener("change",()=>setTimeout(applyLanguagePreference,50));
        setTimeout(()=>{applyLanguagePreference();loadAccountProfile();},300);
        // No permanent MutationObserver here. It was repeatedly scanning the entire page and made V1 slow.
        const refreshDashboard=()=>{if(document.getElementById("nodehub-dashboard"))loadAccountProfile();};
        document.addEventListener("hashchange",refreshDashboard);
    });

    const script=document.createElement("script");script.src="directory-navigation.js?v=20260824";script.async=false;document.body.appendChild(script);
})();