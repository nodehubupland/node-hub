// Node Hub V1 patch loader
(function () {
    if (window.__NODEHUB_V1_PATCH__) return;
    window.__NODEHUB_V1_PATCH__ = true;

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
        .node-card .node-card-image { width:calc(100% + 56px); height:240px; min-height:240px; margin:-28px -28px 24px; display:flex; align-items:center; justify-content:center; overflow:hidden; background:#0d0d0d; border-bottom:1px solid var(--border); }
        .node-card .node-card-image img { display:block; width:100%; height:100%; object-fit:contain; padding:18px; }
        .node-card .node-card-placeholder { color:var(--accent-light); font-size:34px; }
        .hero.section { min-height:auto; padding-top:92px; padding-bottom:92px; }
        @media (max-width:760px) { .hero.section{padding-top:68px;padding-bottom:68px;} .node-card .node-card-image{height:210px;min-height:210px;margin:-28px -28px 22px;width:calc(100% + 56px);} .node-card .node-card-image img{padding:16px;} }
        .nodehub-discord-footer { display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; margin-left:10px; vertical-align:middle; opacity:.9; transition:opacity .2s ease, transform .2s ease; }
        .nodehub-discord-footer:hover { opacity:1; transform:translateY(-1px); }
        .nodehub-discord-footer svg { width:22px; height:22px; fill:currentColor; }
    `;
    document.head.appendChild(style);

    const translations = {
        "pt-BR": {
            "UPLAND COMMUNITY DIRECTORY":"DIRETÓRIO DE COMUNIDADES UPLAND", "DIRECTORY":"DIRETÓRIO", "WORLD MAP":"MAPA MUNDIAL", "Node Hub World Map":"Mapa Mundial Node Hub", "Explore Nodes":"Explorar Nodes", "Submit a Node":"Enviar um Node", "Discover Upland Nodes Around the World":"Descubra Nodes Upland pelo Mundo", "Find Nodes, connect with communities, discover their locations, and explore the people building Upland communities around the world.":"Encontre Nodes, conecte-se com comunidades, descubra suas localizações e conheça as pessoas que constroem comunidades Upland pelo mundo.", "Discover Nodes and their communities around the world.":"Descubra Nodes e suas comunidades pelo mundo.", "Find Nodes Across Upland":"Encontre Nodes pelo Upland", "Explore Node locations around the world.":"Explore localizações de Nodes pelo mundo.", "Loading approved Nodes...":"Carregando Nodes aprovados...", "GROW THE DIRECTORY":"EXPANDA O DIRETÓRIO", "Have a Node?":"Tem um Node?", "Register your Node for free. Your submission will be reviewed by the Node Hub team before appearing in the public directory.":"Cadastre seu Node gratuitamente. O cadastro será analisado pela equipe Node Hub antes de aparecer no diretório público.", "Register your Node":"Cadastre seu Node", "Node registration is available through your Node Hub account.":"O cadastro do Node está disponível pela sua conta Node Hub.", "ABOUT NODE HUB":"SOBRE O NODE HUB", "One place to discover Node communities.":"Um só lugar para descobrir comunidades Node.", "Node Hub is a community-built directory designed to help Upland players discover Nodes, learn about their communities, find their locations, and connect with their official social channels.":"O Node Hub é um diretório criado pela comunidade para ajudar jogadores de Upland a descobrir Nodes, conhecer suas comunidades, encontrar suas localizações e acessar seus canais sociais oficiais.", "Verified Information":"Informações Verificadas", "Each Node profile is submitted by its administrator and reviewed by the Node Hub team before publication.":"Cada perfil de Node é enviado por seu administrador e analisado pela equipe Node Hub antes da publicação.", "Global Community":"Comunidade Global", "Our goal is to make Nodes easier to discover across cities, countries and continents.":"Nosso objetivo é tornar os Nodes mais fáceis de encontrar em cidades, países e continentes.", "Connect":"Conectar", "Discover official Discord, Telegram, X and other community channels from each Node profile.":"Descubra Discord, Telegram, X e outros canais oficiais de cada comunidade nos perfis dos Nodes.", "SUPPORT NODE HUB":"APOIE O NODE HUB", "Help keep the project free.":"Ajude a manter o projeto gratuito.", "Node Hub is being built as a free community platform. If you want to help with its maintenance and future development, you can support us.":"O Node Hub está sendo construído como uma plataforma gratuita da comunidade. Se quiser ajudar na manutenção e no desenvolvimento futuro, você pode nos apoiar.", "Donate / Buy Me a Coffee":"Doar / Comprar um Café", "ROADMAP":"ROADMAP", "Node Hub Evolution":"Evolução do Node Hub", "The platform will continue to evolve with the community.":"A plataforma continuará evoluindo com a comunidade.", "Node Directory":"Diretório de Nodes", "Community":"Comunidade", "Ecosystem":"Ecossistema", "Coming soon.":"Em breve.", "Future development.":"Desenvolvimento futuro.", "Node registration":"Cadastro de Node", "Manual verification":"Verificação manual", "Verified Node profiles":"Perfis de Nodes verificados", "Node administrator dashboard":"Painel administrativo do Node", "Leader information":"Informações do líder", "Node logo and images":"Logo e imagens do Node", "Discord and social links":"Discord e links sociais", "Node location":"Localização do Node", "Worldwide directory":"Diretório mundial", "Search and filtering":"Pesquisa e filtros", "Node profile pages":"Páginas de perfil dos Nodes", "World Map":"Mapa Mundial", "English (US)":"Inglês (EUA)", "Mobile responsive interface":"Interface responsiva para celular", "Donate / Buy Me a Coffee":"Doar / Comprar um Café", "Upland API integration":"Integração com a API Upland", "Connect Upland Account":"Conectar conta Upland", "Upland authentication via API":"Autenticação Upland via API", "Advanced Node statistics":"Estatísticas avançadas dos Nodes", "Community profiles and roles":"Perfis e funções da comunidade", "Node activity and announcements":"Atividades e anúncios dos Nodes", "Media galleries":"Galerias de mídia", "Improved world map":"Mapa mundial aprimorado", "Advanced Node discovery":"Descoberta avançada de Nodes", "Featured Nodes":"Nodes em destaque", "Community interaction":"Interação da comunidade", "Node events and calendar":"Eventos e calendário dos Nodes", "Leaderboards and community rankings":"Rankings e classificações da comunidade", "Node news and updates":"Notícias e atualizações dos Nodes", "Node analytics dashboard":"Painel de análise dos Nodes", "Member and community insights":"Informações sobre membros e comunidades", "Node search by city and neighborhood":"Pesquisa de Nodes por cidade e bairro", "Node availability and status":"Disponibilidade e status dos Nodes", "Spark rental information":"Informações sobre aluguel de Spark", "Spark rental marketplace tools":"Ferramentas de marketplace para aluguel de Spark", "Property sale and listing information":"Informações sobre venda e anúncios de propriedades", "Property discovery tools":"Ferramentas para descobrir propriedades", "Advanced Node analytics":"Análises avançadas de Nodes", "Community management tools":"Ferramentas de gestão da comunidade", "Developer and builder resources":"Recursos para desenvolvedores e builders", "Partner integrations":"Integrações com parceiros", "Notifications and alerts":"Notificações e alertas", "Advanced discovery and recommendations":"Descoberta e recomendações avançadas", "Node ecosystem marketplace":"Marketplace do ecossistema Node", "Cross-community tools":"Ferramentas entre comunidades", "NODE HUB ACCOUNT":"CONTA NODE HUB", "Dashboard":"Painel", "Connect your Upland account to continue.":"Conecte sua conta Upland para continuar.", "Manage your Node Hub account and Node submissions.":"Gerencie sua conta Node Hub e seus Nodes enviados.", "Sign out":"Sair", "Back to Home":"Voltar para Home", "YOUR NODES":"SEUS NODES", "My Nodes":"Meus Nodes", "NODE REGISTRATION":"CADASTRO DE NODE", "Register My Node":"Cadastrar Meu Node", "Node registration will be submitted for review by the Node Hub team.":"O cadastro será enviado para análise da equipe Node Hub.", "Submit Node for Review":"Enviar Node para Análise", "Cancel":"Cancelar", "ACCOUNT INFORMATION":"INFORMAÇÕES DA CONTA", "Username":"Nome de usuário", "Email":"E-mail", "Function":"Função", "No Nodes registered yet.":"Nenhum Node cadastrado ainda.", "Use Register My Node to submit your first Node.":"Use Cadastrar Meu Node para enviar seu primeiro Node.", "Node Name":"Nome do Node", "Description":"Descrição", "City":"Cidade", "Country":"País", "Neighborhood":"Bairro", "Enter the Neighborhood where your Node is located in Upland.":"Informe o bairro onde seu Node está localizado no Upland.", "Continent":"Continente", "Select continent":"Selecione o continente", "North America":"América do Norte", "South America":"América do Sul", "Europe":"Europa", "Asia":"Ásia", "Africa":"África", "Oceania":"Oceania", "Node Logo":"Logo do Node", "Discord":"Discord", "Telegram":"Telegram", "X / Twitter":"X / Twitter", "Not signed in":"Não conectado", "Sign in":"Entrar", "Create an Account":"Criar uma Conta", "Find Nodes Across Upland":"Encontre Nodes pelo Upland", "World Map":"Mapa Mundial", "About":"Sobre", "Support":"Suporte", "Nodes":"Nodes", "Map":"Mapa", "Roadmap":"Roadmap", "UPLAND ACCOUNT":"CONTA UPLAND", "Connect your Upland account to Node Hub to enable Upland API features in your account.":"Conecte sua conta Upland ao Node Hub para habilitar os recursos da API Upland na sua conta.", "How to connect your Upland account":"Como conectar sua conta Upland", "Waiting for Upland to confirm the connection...":"Aguardando o Upland confirmar a conexão...", "Copy Code":"Copiar código", "REGISTER YOUR NODE":"CADASTRE SEU NODE", "Have a Node? Register it here after connecting your Upland account.":"Tem um Node? Cadastre-o aqui depois de conectar sua conta Upland.", "Back to Dashboard":"Voltar ao Painel", "Upland Account Connected":"Conta Upland conectada", "✓ Upland Account Connected":"✓ Conta Upland conectada", "Loading...":"Carregando...", "Loading Nodes...":"Carregando Nodes...", "Connecting to the Node Hub directory.":"Conectando ao diretório Node Hub.", "All continents":"Todos os continentes", "Search Nodes...":"Pesquisar Nodes...", "Privacy Policy":"Política de Privacidade", "All rights reserved.":"Todos os direitos reservados.", "Contact":"Contato", "Need help with your account?":"Precisa de ajuda com sua conta?", "Contact Node Hub":"Entrar em contato com o Node Hub", "Password":"Senha", "Your password":"Sua senha", "Minimum 8 characters":"Mínimo de 8 caracteres", "Create Account":"Criar Conta", "NEW TO NODE HUB?":"NOVO NO NODE HUB?", "Sign in to manage your Node and access your dashboard.":"Entre para gerenciar seu Node e acessar seu painel.", "Create your free account and submit your Node for verification.":"Crie sua conta gratuita e envie seu Node para verificação."
        }
    };

    function addDiscordFooter() {
        const footer = document.querySelector('.site-footer .container');
        if (!footer || footer.querySelector('.nodehub-discord-footer')) return;
        const link = document.createElement('a');
        link.className = 'nodehub-discord-footer';
        link.href = 'https://discord.gg/dtAFAvUbfX';
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', 'Node Hub Discord');
        link.title = 'Node Hub Discord';
        link.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19.54 5.1A16.9 16.9 0 0 0 15.35 3.8l-.52 1.06a15.5 15.5 0 0 0-5.66 0L8.65 3.8A16.9 16.9 0 0 0 4.46 5.1C1.81 9.08 1.09 12.96 1.45 16.78a17 17 0 0 0 5.15 2.61l1.24-1.7a10.8 10.8 0 0 1-1.96-.94l.48-.37c3.78 1.74 7.88 1.74 11.61 0l.49.37c-.63.37-1.29.69-1.97.94l1.24 1.7a17 17 0 0 0 5.15-2.61c.42-4.43-.72-8.27-3.34-11.68ZM8.43 14.45c-1.14 0-2.08-1.05-2.08-2.34s.92-2.34 2.08-2.34 2.09 1.05 2.08 2.34c0 1.29-.92 2.34-2.08 2.34Zm7.14 0c-1.14 0-2.08-1.05-2.08-2.34s.92-2.34 2.08-2.34 2.09 1.05 2.08 2.34c0 1.29-.92 2.34-2.08 2.34Z"/></svg>';
        footer.appendChild(link);
    }

    function applyLanguagePreference() {
        const lang = localStorage.getItem("nodehub-language") || document.getElementById("language-selector")?.value || "en-US";
        document.documentElement.lang = lang;
        const map = translations[lang];
        if (!map) return;
        document.querySelectorAll("[data-i18n]").forEach(el => {
            const key = el.getAttribute("data-i18n");
            if (map[key]) el.textContent = map[key];
        });
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const textNodes = [];
        while (walker.nextNode()) textNodes.push(walker.currentNode);
        textNodes.forEach(node => {
            const value = node.nodeValue.trim();
            if (value && map[value]) node.nodeValue = node.nodeValue.replace(value, map[value]);
        });
        document.querySelectorAll("input[placeholder], textarea[placeholder]").forEach(input => {
            if (map[input.placeholder]) input.placeholder = map[input.placeholder];
        });
        const selector = document.getElementById("language-selector");
        if (selector && selector.value !== lang) selector.value = lang;
        addDiscordFooter();
    }

    window.applyNodeHubLanguage = applyLanguagePreference;

    async function loadAccountProfile() {
        if (!currentUser) return;
        const dashboard = document.getElementById("nodehub-dashboard");
        if (!dashboard || dashboard.querySelector("#account-profile-card")) return;
        try {
            const { data: profile, error } = await db.from("profiles").select("username, role").eq("id", currentUser.id).maybeSingle();
            if (error) console.warn("Profile lookup:", error.message);
            const username = profile?.username || currentUser.user_metadata?.username || currentUser.email?.split("@")[0] || "User";
            const role = profile?.role || "user";
            const card = document.createElement("div"); card.id="account-profile-card"; card.className="auth-card account-profile-card";
            card.innerHTML=`<span class="eyebrow" data-i18n="ACCOUNT INFORMATION">ACCOUNT INFORMATION</span><div class="account-profile-grid"><div class="account-profile-item"><small data-i18n="Username">Username</small><strong>${escapeHTML(username)}</strong></div><div class="account-profile-item"><small data-i18n="Email">Email</small><strong>${escapeHTML(currentUser.email||"")}</strong></div><div class="account-profile-item"><small data-i18n="Function">Function</small><strong>${escapeHTML(role)}</strong></div></div>`;
            dashboard.querySelector(".section-heading")?.after(card); applyLanguagePreference();
        } catch(error){ console.warn("Account profile lookup failed:",error); }
    }

    document.addEventListener("submit", async function(event){
        const form=event.target; if(!form||form.id!=="node-registration-form")return; event.preventDefault();event.stopImmediatePropagation();
        if(!currentUser){window.location.hash="login";return;}
        const getValue=id=>document.getElementById(id)?.value.trim()||"";
        const name=getValue("node-name"),description=getValue("node-description"),city=getValue("node-city"),country=getValue("node-country"),uplandLocation=getValue("node-upland-location"),continent=getValue("node-continent"),discord=getValue("node-discord"),twitter=getValue("node-twitter"),telegram=getValue("node-telegram");
        const imageFile=document.getElementById("node-logo")?.files?.[0]||null;
        if(!name||!city||!country||!continent){alert("Please complete Node Name, City, Country and Continent.");return;}
        const button=form.querySelector("button[type='submit']"),originalText=button?.textContent||"Submit Node for Review"; if(button){button.disabled=true;button.textContent="Submitting...";}
        try{let logoURL=null;if(imageFile){if(!imageFile.type.startsWith("image/")||imageFile.size>5*1024*1024){alert("Please select an image smaller than 5 MB.");return;}const extension=getFileExtension(imageFile.name);const fileName=`${currentUser.id}/${Date.now()}-${randomString(8)}.${extension}`;const{error:uploadError}=await db.storage.from("node-images").upload(fileName,imageFile,{cacheControl:"3600",upsert:false,contentType:imageFile.type});if(uploadError){alert("Could not upload the Node image: "+uploadError.message);return;}logoURL=db.storage.from("node-images").getPublicUrl(fileName).data.publicUrl;}const payload={user_id:currentUser.id,name,description:description||null,city,country,upland_location:uplandLocation||null,continent,logo_url:logoURL,discord_url:discord||null,twitter_url:twitter||null,telegram_url:telegram||null,status:"pending"};const{error}=await db.from("nodes").insert(payload);if(error){alert("Could not register the Node: "+error.message);return;}alert("Node submitted successfully! It will be reviewed by the Node Hub team.");clearNodeForm();await loadMyNodes();window.location.hash="dashboard";}catch(error){console.error(error);alert("Unable to submit the Node. Please try again.");}finally{if(button){button.disabled=false;button.textContent=originalText;}}
    },true);

    document.addEventListener("DOMContentLoaded",function(){
        const uplandLabel=document.querySelector('label[for="node-upland-url"]'),uplandInput=document.getElementById("node-upland-url"),uplandHelp=uplandInput?.nextElementSibling;if(uplandLabel)uplandLabel.remove();if(uplandInput)uplandInput.remove();if(uplandHelp?.tagName==="SMALL")uplandHelp.remove();
        const selector=document.getElementById("language-selector"); selector?.addEventListener("change",()=>{localStorage.setItem("nodehub-language",selector.value);setTimeout(applyLanguagePreference,0);});
        setTimeout(()=>{applyLanguagePreference();loadAccountProfile();},300);
        const refreshDashboard=()=>{if(document.getElementById("nodehub-dashboard")){applyLanguagePreference();loadAccountProfile();}}; document.addEventListener("hashchange",refreshDashboard);
        addDiscordFooter();
    });

    const script=document.createElement("script");script.src="directory-navigation.js?v=20260824";script.async=false;document.body.appendChild(script);
})();