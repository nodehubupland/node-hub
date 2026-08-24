// =====================================================
// NODE HUB V1
// Navigation + Node registration + bilingual UI + live map
// =====================================================

const NH_I18N = {
  "en-US": {
    "Nodes":"Nodes","Map":"Map","About":"About","Support":"Support","Sign in":"Sign in","Dashboard":"Dashboard",
    "Explore Nodes":"Explore Nodes","Submit a Node":"Submit a Node","DIRECTORY":"DIRECTORY","Explore Nodes":"Explore Nodes",
    "Search Nodes...":"Search Nodes...","All continents":"All continents","WORLD MAP":"WORLD MAP","Find Nodes Across Upland":"Find Nodes Across Upland",
    "Explore Node locations around the world.":"Explore Node locations around the world.","Interactive Node map coming soon.":"Interactive Node map coming soon.",
    "GROW THE DIRECTORY":"GROW THE DIRECTORY","Have a Node?":"Have a Node?","Register your Node":"Register your Node",
    "ABOUT NODE HUB":"ABOUT NODE HUB","One place to discover Node communities.":"One place to discover Node communities.",
    "SUPPORT NODE HUB":"SUPPORT NODE HUB","Help keep the project free.":"Help keep the project free.",
    "NODE HUB ACCOUNT":"NODE HUB ACCOUNT","Sign in":"Sign in","Create an Account":"Create an Account","Email":"Email","Password":"Password","Username":"Username",
    "ROADMAP":"ROADMAP","Node Hub Evolution":"Node Hub Evolution"
  },
  "pt-BR": {
    "Nodes":"Nodes","Map":"Mapa","About":"Sobre","Support":"Suporte","Sign in":"Entrar","Dashboard":"Painel",
    "Explore Nodes":"Explorar Nodes","Submit a Node":"Cadastrar Node","DIRECTORY":"DIRETÓRIO","Search Nodes...":"Buscar Nodes...","All continents":"Todos os continentes",
    "WORLD MAP":"MAPA MUNDIAL","Find Nodes Across Upland":"Encontre Nodes pelo mundo","Explore Node locations around the world.":"Explore a localização dos Nodes pelo mundo.",
    "Interactive Node map coming soon.":"Mapa interativo de Nodes em breve.","GROW THE DIRECTORY":"EXPANDA O DIRETÓRIO","Have a Node?":"Você tem um Node?","Register your Node":"Cadastre seu Node",
    "ABOUT NODE HUB":"SOBRE O NODE HUB","One place to discover Node communities.":"Um só lugar para descobrir comunidades de Nodes.",
    "SUPPORT NODE HUB":"APOIE O NODE HUB","Help keep the project free.":"Ajude a manter o projeto gratuito.",
    "NODE HUB ACCOUNT":"CONTA NODE HUB","Create an Account":"Criar uma conta","Email":"E-mail","Password":"Senha","Username":"Nome de usuário",
    "ROADMAP":"ROADMAP","Node Hub Evolution":"Evolução do Node Hub"
  }
};

const NH_TEXT = new Map();
function nhCollectText(root = document.body) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    const value = node.nodeValue.trim();
    if (value && value.length < 90 && !NH_TEXT.has(node)) NH_TEXT.set(node, value);
  }
}
function nhTranslate(locale) {
  nhCollectText();
  const dict = NH_I18N[locale] || NH_I18N["en-US"];
  NH_TEXT.forEach((original, node) => {
    if (!node.isConnected) return;
    const translated = dict[original];
    if (translated) node.nodeValue = node.nodeValue.replace(original, translated);
  });
  document.querySelectorAll("input[placeholder]").forEach(input => {
    const key = input.dataset.nhPlaceholder || input.placeholder;
    input.dataset.nhPlaceholder = key;
    if (dict[key]) input.placeholder = dict[key];
  });
  document.documentElement.lang = locale === "pt-BR" ? "pt-BR" : "en";
  localStorage.setItem("nodehub-language", locale);
}
function initializeBilingualUI() {
  const selector = document.getElementById("language-selector");
  if (!selector) return;
  const saved = localStorage.getItem("nodehub-language") || "en-US";
  selector.value = saved;
  selector.addEventListener("change", () => nhTranslate(selector.value));
  setTimeout(() => nhTranslate(saved), 0);
}

// =====================================================
// PUBLIC NODE NAVIGATION
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
  const locationInput = document.getElementById("node-upland-location");
  if (!locationInput) return;
  const label = document.createElement("label");
  label.setAttribute("for", "node-upland-link");
  label.textContent = "Upland Node Link";
  const input = document.createElement("input");
  input.type = "url"; input.id = "node-upland-link"; input.placeholder = "https://play.upland.me/..."; input.autocomplete = "url";
  const small = document.createElement("small");
  small.textContent = "Paste the direct Upland link to your Node. This helps us identify the exact location.";
  locationInput.insertAdjacentElement("afterend", small);
  small.insertAdjacentElement("afterend", label);
  label.insertAdjacentElement("afterend", input);
}

function setupUplandNodeSubmit() {
  const form = document.getElementById("node-registration-form");
  if (!form || form.dataset.uplandLinkHandler === "true") return;
  form.dataset.uplandLinkHandler = "true";
  form.addEventListener("submit", async event => {
    event.preventDefault(); event.stopImmediatePropagation();
    const user = typeof currentUser !== "undefined" ? currentUser : window.currentUser;
    if (!user) { alert("You must be signed in to register a Node."); window.location.hash = "login"; return; }
    const get = id => document.getElementById(id)?.value.trim() || "";
    const name=get("node-name"), description=get("node-description"), city=get("node-city"), country=get("node-country"), uplandLocation=get("node-upland-location"), uplandNodeLink=get("node-upland-link"), continent=get("node-continent"), discord=get("node-discord"), twitter=get("node-twitter"), telegram=get("node-telegram");
    if (!name || !city || !country || !continent) { alert("Please complete Node Name, City, Country and Continent."); return; }
    if (uplandNodeLink) { try { const parsed=new URL(uplandNodeLink); if (!["https:","http:"].includes(parsed.protocol)) throw 0; } catch { alert("Please enter a valid Upland Node link."); return; } }
    const imageFile=document.getElementById("node-logo")?.files?.[0] || null;
    try {
      let logoURL=null;
      if (imageFile) {
        if (!imageFile.type.startsWith("image/") || imageFile.size > 5*1024*1024) { alert("Please select an image smaller than 5 MB."); return; }
        const extension=imageFile.name.includes(".") ? imageFile.name.split(".").pop().toLowerCase() : "jpg";
        const fileName=`${user.id}/${Date.now()}-${Math.random().toString(36).slice(2,10)}.${extension}`;
        const {error:uploadError}=await db.storage.from("node-images").upload(fileName,imageFile,{cacheControl:"3600",upsert:false,contentType:imageFile.type});
        if(uploadError){alert("Could not upload the Node image: "+uploadError.message);return;}
        logoURL=db.storage.from("node-images").getPublicUrl(fileName).data.publicUrl;
      }
      const {error}=await db.from("nodes").insert({user_id:user.id,name,description:description||null,city,country,upland_location:uplandLocation||null,upland_node_url:uplandNodeLink||null,continent,logo_url:logoURL,discord_url:discord||null,twitter_url:twitter||null,telegram_url:telegram||null,status:"pending"});
      if(error){alert("Could not register the Node: "+error.message);return;}
      alert("Node submitted successfully! It will be reviewed by the Node Hub team.");
      form.reset(); document.getElementById("node-image-preview")?.replaceChildren();
      if(typeof loadMyNodes === "function") await loadMyNodes();
      window.location.hash="dashboard";
    } catch(error){console.error(error);alert("Unable to submit the Node.");}
  }, true);
}

// =====================================================
// LIVE WORLD MAP
// =====================================================

async function initializeWorldMap() {
  const map=document.querySelector("#map .map-preview");
  if(!map || typeof db === "undefined") return;
  map.innerHTML=`<div class="node-map-live" style="position:relative;z-index:2;width:100%;height:100%;min-height:340px;padding:24px;box-sizing:border-box;display:flex;flex-direction:column;gap:16px;">
    <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;"><span style="font-size:10px;letter-spacing:.14em;font-weight:900;color:var(--accent-light);">● LIVE DIRECTORY</span><strong id="map-node-total">Loading Nodes...</strong></div>
    <div id="map-node-stats" style="display:flex;gap:10px;flex-wrap:wrap;"></div>
    <div style="display:grid;grid-template-columns:minmax(0,1.25fr) minmax(240px,.75fr);gap:16px;min-height:250px;flex:1;">
      <div id="node-map-visual" style="position:relative;overflow:hidden;border:1px solid rgba(255,255,255,.08);border-radius:18px;min-height:250px;background:radial-gradient(circle at 50% 45%,rgba(255,132,0,.13),transparent 40%),rgba(0,0,0,.18);"><div style="position:absolute;inset:18% 10%;border:1px solid rgba(255,255,255,.07);border-radius:48%;transform:rotate(-8deg);"></div><div style="position:absolute;inset:28% 18%;border:1px solid rgba(255,255,255,.06);border-radius:42%;transform:rotate(12deg);"></div><span style="position:absolute;left:16px;bottom:14px;font-size:10px;opacity:.5;letter-spacing:.12em;text-transform:uppercase;">Node locations</span></div>
      <div id="node-map-list" style="overflow:auto;max-height:330px;padding-right:4px;"></div>
    </div>
  </div>`;

  try {
    const {data,error}=await db.from("nodes").select("id,name,city,country,continent,upland_location,status").eq("status","approved").order("name",{ascending:true});
    if(error) throw error;
    const approved=data||[];
    const countries=[...new Set(approved.map(n=>n.country).filter(Boolean))];
    const continents=[...new Set(approved.map(n=>n.continent).filter(Boolean))];
    const total=document.getElementById("map-node-total");
    const stats=document.getElementById("map-node-stats");
    if(total) total.textContent=`${approved.length} verified ${approved.length===1?"Node":"Nodes"}`;
    if(stats) stats.innerHTML=`<span style="padding:8px 11px;border:1px solid rgba(255,255,255,.08);border-radius:999px;font-size:11px;"><b>${approved.length}</b> Nodes</span><span style="padding:8px 11px;border:1px solid rgba(255,255,255,.08);border-radius:999px;font-size:11px;"><b>${countries.length}</b> Countries</span><span style="padding:8px 11px;border:1px solid rgba(255,255,255,.08);border-radius:999px;font-size:11px;"><b>${continents.length}</b> Continents</span>`;
    const list=document.getElementById("node-map-list");
    if(!approved.length){list.innerHTML=`<div style="padding:28px 10px;opacity:.7;text-align:center;"><strong>No verified Nodes yet</strong><p>Approved Nodes will appear here automatically.</p></div>`;return;}
    const grouped=approved.reduce((acc,node)=>{const key=node.continent||"Other";(acc[key]??=[]).push(node);return acc;},{});
    list.innerHTML=Object.entries(grouped).map(([continent,nodes])=>`<div style="margin-bottom:14px;"><div style="display:flex;justify-content:space-between;padding:8px 4px;font-size:11px;text-transform:uppercase;letter-spacing:.08em;font-weight:900;opacity:.65;"><span>${escapeMapHTML(continent)}</span><b>${nodes.length}</b></div>${nodes.map(node=>`<a href="#node/${encodeURIComponent(node.id)}" style="display:flex;gap:10px;align-items:flex-start;padding:11px 10px;margin-bottom:6px;border:1px solid rgba(255,255,255,.07);border-radius:12px;text-decoration:none;color:inherit;background:rgba(255,255,255,.025);"><span style="width:7px;height:7px;border-radius:50%;background:var(--accent-light);box-shadow:0 0 12px var(--accent-light);margin-top:6px;flex:0 0 auto;"></span><span style="min-width:0;display:flex;flex-direction:column;gap:3px;"><strong style="font-size:12px;">${escapeMapHTML(node.name||"Unnamed Node")}</strong><small style="opacity:.65;">${escapeMapHTML([node.city,node.country].filter(Boolean).join(", ")||"Location not provided")}</small>${node.upland_location?`<small style="opacity:.5;">${escapeMapHTML(node.upland_location)}</small>`:""}</span></a>`).join("")}</div>`).join("");
    const visual=document.getElementById("node-map-visual");
    approved.forEach((node,index)=>{const marker=document.createElement("a");marker.href=`#node/${encodeURIComponent(node.id)}`;marker.title=node.name||"Node";marker.style.cssText=`position:absolute;left:${12+((index*37)%76)}%;top:${18+((index*53)%60)}%;width:10px;height:10px;border-radius:50%;background:var(--accent-light);box-shadow:0 0 0 5px rgba(255,132,0,.08),0 0 16px var(--accent-light);z-index:3;`;visual.appendChild(marker);});
  } catch(error){console.error("World map error:",error);const total=document.getElementById("map-node-total");if(total)total.textContent="Map temporarily unavailable";}
}

function escapeMapHTML(value){return String(value??"").replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;").replaceAll("'","&#039;");}

// =====================================================
// INITIALIZE
// =====================================================

function initializeNodeHubV1(){
  initializeBilingualUI();
  setupUplandNodeLink();
  setupUplandNodeSubmit();
  initializeWorldMap();
  const observer=new MutationObserver(()=>{const form=document.getElementById("node-registration-form");if(form){setupUplandNodeLink();setupUplandNodeSubmit();nhCollectText();}});
  observer.observe(document.body,{childList:true,subtree:true});
}

document.addEventListener("DOMContentLoaded",initializeNodeHubV1);
