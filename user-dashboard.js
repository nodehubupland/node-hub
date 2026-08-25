/* Node Hub V1 - user dashboard. Loaded after app.js so normal users can access their account dashboard. */
(function () {
  if (!window.__nodehubUplandLoader) {
    window.__nodehubUplandLoader = true;
    const s = document.createElement('script');
    s.src = 'upland-connect.js?v=20260825-v2';
    s.async = false;
    document.head.appendChild(s);
  }
  const text = {
    en: { eyebrow:'NODE HUB ACCOUNT', title:'Dashboard', intro:'Manage your Node Hub account and submit your Node for review.', account:'ACCOUNT INFORMATION', username:'Username', email:'Email', role:'Function', nodes:'YOUR NODES', myNodes:'My Nodes', empty:'No Nodes registered yet.', emptyHelp:'Use Register My Node to submit your first Node.', registration:'NODE REGISTRATION', register:'Register My Node', review:'Node registration will be submitted for review by the Node Hub team.', name:'Node Name', description:'Description', city:'City', country:'Country', neighborhood:'Neighborhood', neighborhoodHelp:'Enter the Neighborhood where your Node is located in Upland.', continent:'Continent', select:'Select continent', logo:'Node Logo', discord:'Discord', twitter:'X / Twitter', telegram:'Telegram', submit:'Submit Node for Review', cancel:'Cancel', signout:'Sign out', loading:'Loading your Nodes...', pending:'Pending review', approved:'Approved', rejected:'Rejected', success:'Node submitted for review.', error:'Unable to submit the Node. Please check the required fields and try again.' },
    pt: { eyebrow:'CONTA NODE HUB', title:'Painel', intro:'Gerencie sua conta Node Hub e envie seu Node para análise.', account:'INFORMAÇÕES DA CONTA', username:'Nome de usuário', email:'E-mail', role:'Função', nodes:'SEUS NODES', myNodes:'Meus Nodes', empty:'Nenhum Node cadastrado ainda.', emptyHelp:'Use Cadastrar meu Node para enviar seu primeiro Node.', registration:'CADASTRO DE NODE', register:'Cadastrar meu Node', review:'O cadastro será enviado para análise da equipe Node Hub.', name:'Nome do Node', description:'Descrição', city:'Cidade', country:'País', neighborhood:'Bairro', neighborhoodHelp:'Informe o bairro onde seu Node está localizado no Upland.', continent:'Continente', select:'Selecione o continente', logo:'Logo do Node', discord:'Discord', twitter:'X / Twitter', telegram:'Telegram', submit:'Enviar Node para análise', cancel:'Cancelar', signout:'Sair', loading:'Carregando seus Nodes...', pending:'Em análise', approved:'Aprovado', rejected:'Rejeitado', success:'Node enviado para análise.', error:'Não foi possível enviar o Node. Verifique os campos obrigatórios e tente novamente.' }
  };
  const t = () => localStorage.getItem('nodehub-language') === 'pt-BR' ? text.pt : text.en;
  const esc = v => typeof escapeHTML === 'function' ? escapeHTML(v) : String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));

  async function loadMine() {
    const box = document.getElementById('user-dashboard-nodes');
    if (!box || !currentUser) return;
    const l = t();
    box.textContent = l.loading;
    try {
      const { data, error } = await db.from('nodes').select('id,name,city,country,upland_location,status,created_at').eq('user_id', currentUser.id).order('created_at', { ascending:false });
      if (error) throw error;
      if (!data?.length) { box.innerHTML = `<p>${l.empty}</p><p style="opacity:.7">${l.emptyHelp}</p>`; return; }
      box.innerHTML = data.map(n => {
        const s = n.status || 'pending';
        const label = s === 'approved' ? l.approved : s === 'rejected' ? l.rejected : l.pending;
        return `<div style="padding:14px 0;border-bottom:1px solid rgba(255,255,255,.08)"><strong>${esc(n.name || 'Node')}</strong><div style="opacity:.72;margin-top:4px">${esc(n.city || '')}${n.country ? ', ' + esc(n.country) : ''}${n.upland_location ? ' · ' + esc(n.upland_location) : ''}</div><small style="display:inline-block;margin-top:8px;padding:5px 9px;border-radius:999px;background:rgba(255,255,255,.07)">${label}</small></div>`;
      }).join('');
    } catch (e) { console.error('User dashboard nodes:', e); box.textContent = l.error; }
  }

  async function submitNode(e) {
    e.preventDefault();
    const form = e.currentTarget, button = form.querySelector('button[type=submit]'), msg = document.getElementById('user-dashboard-message'), l = t();
    const name = document.getElementById('user-node-name').value.trim();
    const description = document.getElementById('user-node-description').value.trim();
    const city = document.getElementById('user-node-city').value.trim();
    const country = document.getElementById('user-node-country').value.trim();
    const neighborhood = document.getElementById('user-node-neighborhood').value.trim();
    const continent = document.getElementById('user-node-continent').value;
    const discord = document.getElementById('user-node-discord').value.trim();
    const twitter = document.getElementById('user-node-twitter').value.trim();
    const telegram = document.getElementById('user-node-telegram').value.trim();
    const file = document.getElementById('user-node-logo').files?.[0];
    button.disabled = true; button.textContent = l.loading;
    try {
      let logo_url = '';
      if (file) {
        if (file.size > 5 * 1024 * 1024) throw new Error('Logo must be 5 MB or smaller.');
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '-');
        const path = `${currentUser.id}/${Date.now()}-${safe}`;
        const upload = await db.storage.from('node-images').upload(path, file, { upsert:false, contentType:file.type });
        if (upload.error) throw upload.error;
        logo_url = db.storage.from('node-images').getPublicUrl(path).data.publicUrl;
      }
      const { error } = await db.from('nodes').insert({ user_id:currentUser.id, name, description, city, country, upland_location:neighborhood, continent, logo_url, discord_url:discord, twitter_url:twitter, telegram_url:telegram, status:'pending' });
      if (error) throw error;
      msg.textContent = l.success; form.reset(); await loadMine();
    } catch (err) { console.error('Node submission:', err); msg.textContent = err?.message || l.error; }
    finally { button.disabled = false; button.textContent = l.submit; }
  }

  async function showDashboard() {
    if (!currentUser) { location.hash = 'login'; return; }
    setDashboardMode(true);
    document.getElementById('nodehub-user-dashboard')?.remove();
    const l = t(), section = document.createElement('section');
    section.id = 'nodehub-user-dashboard'; section.className = 'section section-alt';
    section.innerHTML = `<div class="container" style="max-width:1100px;margin:0 auto"><div class="section-heading"><span class="eyebrow">${l.eyebrow}</span><h1>${l.title}</h1><p>${l.intro}</p></div><div class="auth-card" style="margin-bottom:24px"><span class="eyebrow">${l.account}</span><div id="user-account-info" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;margin-top:18px"></div></div><div class="auth-card" style="margin-bottom:24px"><span class="eyebrow">${l.nodes}</span><h2>${l.myNodes}</h2><div id="user-dashboard-nodes" style="margin-top:18px">${l.loading}</div></div><div class="auth-card"><span class="eyebrow">${l.registration}</span><h2>${l.register}</h2><p>${l.review}</p><form id="user-node-form" style="display:grid;gap:12px;margin-top:20px"><label>${l.name}<input id="user-node-name" required></label><label>${l.description}<textarea id="user-node-description" rows="4"></textarea></label><label>${l.city}<input id="user-node-city" required></label><label>${l.country}<input id="user-node-country" required></label><label>${l.neighborhood}<input id="user-node-neighborhood" required><small style="display:block;margin-top:5px;opacity:.7">${l.neighborhoodHelp}</small></label><label>${l.continent}<select id="user-node-continent" required><option value="">${l.select}</option><option>North America</option><option>South America</option><option>Europe</option><option>Asia</option><option>Africa</option><option>Oceania</option></select></label><label>${l.logo}<input id="user-node-logo" type="file" accept="image/png,image/jpeg,image/webp"></label><label>${l.discord}<input id="user-node-discord" type="url"></label><label>${l.twitter}<input id="user-node-twitter" type="url"></label><label>${l.telegram}<input id="user-node-telegram" type="url"></label><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:8px"><button class="button button-primary" type="submit">${l.submit}</button><button class="button button-secondary" type="button" id="user-dashboard-signout">${l.signout}</button></div><p id="user-dashboard-message" style="margin:0"></p></form></div></div>`;
    document.body.appendChild(section);
    try {
      const { data:profile } = await db.from('profiles').select('username,email,role').eq('id', currentUser.id).maybeSingle();
      const info = document.getElementById('user-account-info');
      if (info) info.innerHTML = `<div><small>${l.username}</small><strong style="display:block;margin-top:6px">${esc(profile?.username || currentUser.email?.split('@')[0] || 'User')}</strong></div><div><small>${l.email}</small><strong style="display:block;margin-top:6px;word-break:break-word">${esc(currentUser.email || '')}</strong></div><div><small>${l.role}</small><strong style="display:block;margin-top:6px;text-transform:capitalize">${esc(profile?.role || 'user')}</strong></div>`;
    } catch {}
    document.getElementById('user-node-form').addEventListener('submit', submitNode);
    document.getElementById('user-dashboard-signout').addEventListener('click', () => signOut());
    await loadMine();
    section.scrollIntoView({ behavior:'smooth', block:'start' });
  }

  function removeDashboard() { document.getElementById('nodehub-user-dashboard')?.remove(); setDashboardMode(false); }
  window.showDashboard = showDashboard;
  window.removeDashboard = removeDashboard;
  window.updateDashboard = () => { if (currentUser) showDashboard(); };
})();
