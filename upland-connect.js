/* Node Hub V1 - Upland account connection flow. */
(function(){
 const FUNCTION_NAME='upland-connect';let pollTimer=null,observer=null;
 const isPT=()=>localStorage.getItem('nodehub-language')==='pt-BR';
 const L=()=>isPT()?{account:'CONTA UPLAND',connect:'Conectar conta Upland',desc:'Conecte sua conta Upland ao Node Hub para habilitar os recursos da API Upland na sua conta.',generate:'Gerando código...',copy:'Copiar código',copied:'Copiado',intro:'Gere o código, copie, siga os passos abaixo no Upland e depois volte ao Node Hub.',how:'Como conectar sua conta Upland',steps:['Abra o Upland.','Acesse Configurações.','Abra Aplicativos de terceiros.','Digite o código de conexão mostrado acima.','Confirme e autorize o Node Hub.','Volte ao Node Hub e aguarde a confirmação da conexão.'],waiting:'Aguardando o Upland confirmar a conexão...',statusConnected:'Conectado'}:{account:'UPLAND ACCOUNT',connect:'Connect Upland Account',desc:'Connect your Upland account to Node Hub to enable Upland API features in your account.',generate:'Generating code...',copy:'Copy Code',copied:'Copied',intro:'Generate the code, copy it, follow the steps below in Upland, then return to Node Hub.',how:'How to connect your Upland account',steps:['Open Upland.','Go to Settings.','Open Third-party applications.','Enter the connection code shown above.','Confirm and authorize Node Hub.','Return to Node Hub and wait for the connection to be confirmed.'],waiting:'Waiting for Upland to confirm the connection...',statusConnected:'Connected'};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
 function stopPolling(){if(pollTimer)clearInterval(pollTimer);pollTimer=null;}
 async function readConnection(){if(!window.db)return null;const{data,error}=await db.functions.invoke(FUNCTION_NAME,{body:{action:'status'}});if(error)throw error;return data?.success?{status:data.status,connection_code:data.code||null,upland_user_id:data.upland_user_id||null,connected_at:data.connected_at||null}:null;}
 function copyCode(code,b){if(!code)return;const done=()=>{if(!b)return;const old=b.textContent;b.textContent=L().copied;setTimeout(()=>b.textContent=old,1600)};if(navigator.clipboard?.writeText)navigator.clipboard.writeText(code).then(done).catch(()=>fallbackCopy(code,done));else fallbackCopy(code,done)}
 function fallbackCopy(code,done){const i=document.createElement('textarea');i.value=code;i.setAttribute('readonly','');i.style.position='fixed';i.style.opacity='0';document.body.appendChild(i);i.select();try{document.execCommand('copy');done()}catch(e){console.warn('Copy failed',e)}i.remove()}
 function render(box,c){const l=L();if(c?.status==='connected'){box.innerHTML=`<span class="eyebrow">${l.account}</span><h2 style="margin-top:8px">${l.connect}</h2><p>${l.desc}</p><div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:14px"><button id="upland-connected-button" class="button button-primary" type="button" disabled>✓ ${l.statusConnected}</button></div>`;stopPolling();return}if(!c||c.status==='none'||c.status==='disconnected'||c.status==='failed'){box.innerHTML=`<span class="eyebrow">${l.account}</span><h2 style="margin-top:8px">${l.connect}</h2><p>${l.desc}</p><button id="upland-connect-button" class="button button-primary" type="button">${l.connect}</button><p id="upland-connect-message" style="margin:14px 0 0"></p>`;box.querySelector('#upland-connect-button').addEventListener('click',startConnection);return}const code=c.connection_code||'';box.innerHTML=`<span class="eyebrow">${l.account}</span><h2 style="margin-top:8px">${l.connect}</h2><p>${l.intro}</p><div style="display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin:18px 0"><div style="font-size:clamp(28px,6vw,44px);font-weight:800;letter-spacing:.16em;text-align:center;padding:18px 20px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.04)">${esc(code)}</div><button id="upland-copy-code" class="button button-secondary" type="button">${l.copy}</button></div><div style="margin-top:22px;padding:18px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.025);text-align:left"><strong style="display:block;margin-bottom:12px">${l.how}</strong><ol style="margin:0;padding-left:22px;line-height:1.8">${l.steps.map(s=>`<li>${s}</li>`).join('')}</ol></div><p id="upland-waiting-message" style="opacity:.75;margin-top:16px">${l.waiting}</p>`;box.querySelector('#upland-copy-code')?.addEventListener('click',()=>copyCode(code,box.querySelector('#upland-copy-code')))}
 async function refresh(box){try{const c=await readConnection();render(box,c);if(c?.status==='pending')startPolling(box)}catch(e){console.error('Upland connection status:',e);const m=box.querySelector('#upland-connect-message')||box.querySelector('#upland-waiting-message');if(m)m.textContent=isPT()?'Não foi possível carregar o status da conexão Upland. Tentando novamente...':'Unable to load the Upland connection status. Retrying...';startPolling(box)}}
 function startPolling(box){stopPolling();pollTimer=setInterval(async()=>{try{const c=await readConnection();if(c?.status==='connected'||c?.status==='pending'||c?.status==='failed'||c?.status==='disconnected'||c?.status==='none')render(box,c)}catch(e){console.warn('Upland status polling:',e)}},2000)}
 async function startConnection(){const b=document.getElementById('upland-connect-button'),m=document.getElementById('upland-connect-message'),l=L();if(b){b.disabled=true;b.textContent=l.generate}try{const existing=await readConnection();if(existing?.status==='connected'||(existing?.status==='pending'&&existing.connection_code)){const box=document.getElementById('upland-account-card');if(box){render(box,existing);if(existing.status==='pending')startPolling(box)}return}const{data,error}=await db.functions.invoke(FUNCTION_NAME,{body:{action:'generate'}});if(error)throw error;if(data?.status==='connected'){const box=document.getElementById('upland-account-card');if(box)render(box,data);return}if(!data?.code)throw new Error(data?.error||(isPT()?'O Upland não retornou um código de conexão.':'Upland did not return a connection code.'));const box=document.getElementById('upland-account-card');if(box){render(box,{status:'pending',connection_code:data.code});startPolling(box)}}catch(e){console.error('Upland connection:',e);if(m)m.textContent=e?.message||(isPT()?'Não foi possível gerar o código de conexão Upland.':'Unable to generate an Upland connection code.');if(b){b.disabled=false;b.textContent=l.connect}}}
 function mount(){const d=document.getElementById('nodehub-user-dashboard'),box=document.getElementById('upland-account-card');if(!d||!box)return;if(!box.dataset.uplandInitialized){box.dataset.uplandInitialized='1';refresh(box)}}
 function refreshLanguage(){const box=document.getElementById('upland-account-card');if(box){box.dataset.uplandInitialized='';refresh(box)}}
 window.__nodehubUplandMount=mount;window.__nodehubUplandRefreshLanguage=refreshLanguage;
 function watch(){mount();if(observer)observer.disconnect();observer=new MutationObserver(mount);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener('hashchange',mount);window.addEventListener('nodehub:language-change',refreshLanguage)}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',watch);else watch();
})();

/* Restore the centralized Portuguese language layer and correct post-login routing. */
(function(){
  function loadLanguagePatch(){
    if(window.__NODEHUB_V1_PATCH__)return;
    if(document.querySelector('script[data-nodehub-language-patch]'))return;
    const s=document.createElement('script');
    s.src='nodehub-patch.js?v=20260828-language1';
    s.dataset.nodehubLanguagePatch='1';
    document.head.appendChild(s);
  }
  function goToDashboardAfterLogin(){
    if(!window.currentUser)return;
    const h=location.hash.toLowerCase();
    if(h==='#login'||h===''){
      location.hash='dashboard';
      requestAnimationFrame(()=>window.scrollTo({top:0,left:0,behavior:'instant'}));
      setTimeout(()=>window.scrollTo(0,0),100);
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadLanguagePatch);else loadLanguagePatch();
  window.addEventListener('hashchange',()=>{setTimeout(goToDashboardAfterLogin,0)});
  document.addEventListener('DOMContentLoaded',()=>setTimeout(goToDashboardAfterLogin,150));
  if(window.db?.auth)window.db.auth.onAuthStateChange((event)=>{if(event==='SIGNED_IN')setTimeout(goToDashboardAfterLogin,50)});
})();