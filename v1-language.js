/* Node Hub V1 complete PT-BR language layer */
(function () {
    const translations = {
        "Discover Upland Nodes Around the World":"Descubra Nodes do Upland pelo mundo",
        "Find Nodes, connect with communities, discover their locations, and explore the people building Upland communities around the world.":"Encontre Nodes, conecte-se com comunidades, descubra suas localizações e conheça as pessoas que constroem comunidades no Upland pelo mundo.",
        "Explore Nodes":"Explorar Nodes","Submit a Node":"Cadastrar um Node","DIRECTORY":"DIRETÓRIO","Discover Nodes and their communities around the world.":"Descubra Nodes e suas comunidades pelo mundo.","All continents":"Todos os continentes","Search Nodes...":"Buscar Nodes...","WORLD MAP":"MAPA MUNDIAL","Find Nodes Across Upland":"Encontre Nodes pelo Upland","Explore Node locations around the world.":"Explore localizações de Nodes pelo mundo.","Node Hub World Map":"Mapa Mundial do Node Hub","Loading...":"Carregando...","Loading approved Nodes...":"Carregando Nodes aprovados...","GROW THE DIRECTORY":"EXPANDA O DIRETÓRIO","Have a Node?":"Você tem um Node?","Register your Node for free. Your submission will be reviewed by the Node Hub team before appearing in the public directory.":"Cadastre seu Node gratuitamente. O cadastro será analisado pela equipe Node Hub antes de aparecer no diretório público.","Register your Node":"Cadastrar seu Node","Node registration is available through your Node Hub account.":"O cadastro de Node está disponível pela sua conta Node Hub.","ABOUT NODE HUB":"SOBRE O NODE HUB","One place to discover Node communities.":"Um só lugar para descobrir comunidades de Nodes.","Verified Information":"Informações verificadas","Global Community":"Comunidade global","Connect":"Conecte-se","SUPPORT NODE HUB":"APOIE O NODE HUB","Help keep the project free.":"Ajude a manter o projeto gratuito.","English (US) is the default language. Portuguese (Brazil) is also available.":"Inglês (EUA) é o idioma padrão. Português (Brasil) também está disponível.","ROADMAP":"ROADMAP","Node Hub Evolution":"Evolução do Node Hub","The platform will continue to evolve with the community.":"A plataforma continuará evoluindo com a comunidade.","Node Directory":"Diretório de Nodes","Community":"Comunidade","Ecosystem":"Ecossistema","Coming soon.":"Em breve.","Future development.":"Desenvolvimento futuro.","Sign in":"Entrar","Create an Account":"Criar uma conta","About":"Sobre","Support":"Suporte","Nodes":"Nodes","Map":"Mapa","Roadmap":"Roadmap","Upland Community Directory":"Diretório de comunidades do Upland","Email":"E-mail","Password":"Senha","Username":"Nome de usuário","Function":"Função","Dashboard":"Painel","Sign out":"Sair","ACCOUNT INFORMATION":"INFORMAÇÕES DA CONTA","NODE HUB ACCOUNT":"CONTA NODE HUB","YOUR NODES":"SEUS NODES","My Nodes":"Meus Nodes","No Nodes registered yet.":"Nenhum Node cadastrado ainda.","Use Register My Node to submit your first Node.":"Use Cadastrar seu Node para enviar seu primeiro Node.","NODE REGISTRATION":"CADASTRO DE NODE","Register My Node":"Cadastrar meu Node","Node registration will be submitted for review by the Node Hub team.":"O cadastro será enviado para análise da equipe Node Hub.","Node Name":"Nome do Node","Description":"Descrição","City":"Cidade","Country":"País","Neighborhood":"Bairro","Continent":"Continente","Select continent":"Selecione o continente","North America":"América do Norte","South America":"América do Sul","Europe":"Europa","Asia":"Ásia","Africa":"África","Oceania":"Oceania","Node Logo":"Logo do Node","X / Twitter":"X / Twitter","Telegram":"Telegram","Discord":"Discord","Cancel":"Cancelar","Submit Node for Review":"Enviar Node para análise","NEW TO NODE HUB?":"NOVO NO NODE HUB?","Minimum 8 characters":"Mínimo de 8 caracteres","Your username":"Seu nome de usuário","Your password":"Sua senha","Your username":"Seu nome de usuário","Your Node":"Seu Node" 
    };

    function translateNode(node, map) {
        if (node.nodeType !== Node.TEXT_NODE) return;
        const raw = node.nodeValue;
        const trimmed = raw.trim();
        if (!trimmed || !map[trimmed]) return;
        node.nodeValue = raw.replace(trimmed, map[trimmed]);
    }

    function applyLanguage() {
        const lang = localStorage.getItem("nodehub-language") || "en-US";
        document.documentElement.lang = lang;
        if (lang !== "pt-BR") return;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        const nodes = [];
        while (walker.nextNode()) nodes.push(walker.currentNode);
        nodes.forEach(n => translateNode(n, translations));
        document.querySelectorAll("input[placeholder],textarea[placeholder]").forEach(el => {
            if (translations[el.placeholder]) el.placeholder = translations[el.placeholder];
        });
        document.querySelectorAll("option").forEach(el => {
            const text = el.textContent.trim();
            if (translations[text]) el.textContent = translations[text];
        });
    }

    document.addEventListener("change", function (e) {
        if (e.target && e.target.id === "language-selector") {
            localStorage.setItem("nodehub-language", e.target.value);
            setTimeout(applyLanguage, 50);
        }
    });
    document.addEventListener("DOMContentLoaded", function () {
        setTimeout(applyLanguage, 150);
        const observer = new MutationObserver(() => {
            if (localStorage.getItem("nodehub-language") === "pt-BR") applyLanguage();
        });
        observer.observe(document.body, {childList:true, subtree:true});
    });
})();
