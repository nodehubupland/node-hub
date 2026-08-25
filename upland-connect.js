/* Node Hub V1 - Upland account connection flow. */
(function () {
  const FUNCTION_NAME = 'upland-connect';
  let pollTimer = null;
  let observer = null;

  function esc(value) {
    return typeof escapeHTML === 'function' ? escapeHTML(value) : String(value ?? '').replace(/[&<>\"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' }[c]));
  }
  function stopPolling() { if (pollTimer) clearInterval(pollTimer); pollTimer = null; }
  async function readConnection() {
    if (!currentUser || !window.db) return null;
    const { data, error } = await db.from('upland_connections').select('status,connection_code,upland_user_id,connected_at,updated_at').eq('user_id', currentUser.id).maybeSingle();
    if (error) throw error;
    return data;
  }
  function render(box, connection) {
    if (!connection || connection.status === 'disconnected' || connection.status === 'failed') {
      box.innerHTML = `<span class="eyebrow">UPLAND ACCOUNT</span><h2 style="margin-top:8px">Connect Upland Account</h2><p>Connect your Upland account to Node Hub to enable Upland API features in your account.</p><button id="upland-connect-button" class="button button-primary" type="button">Connect Upland Account</button><p id="upland-connect-message" style="margin:14px 0 0"></p>`;
      box.querySelector('#upland-connect-button').addEventListener('click', startConnection); return;
    }
    if (connection.status === 'connected') {
      stopPolling();
      box.innerHTML = `<span class="eyebrow">UPLAND ACCOUNT</span><h2 style="margin-top:8px">Upland Account Connected</h2><p>Your Upland account is connected to Node Hub.</p><div style="display:grid;gap:8px;margin-top:14px"><div><small>Status</small><strong style="display:block;margin-top:4px">Connected</strong></div><div><small>Upland User ID</small><strong style="display:block;margin-top:4px;word-break:break-all">${esc(connection.upland_user_id || '')}</strong></div></div>`; return;
    }
    box.innerHTML = `<span class="eyebrow">UPLAND ACCOUNT</span><h2 style="margin-top:8px">Connect Upland Account</h2><p>Open Upland and enter this connection code to authorize Node Hub:</p><div style="font-size:clamp(28px,6vw,44px);font-weight:800;letter-spacing:.16em;text-align:center;padding:20px;margin:18px 0;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.04)">${esc(connection.connection_code || '')}</div><p style="opacity:.75">Waiting for Upland to confirm the connection...</p>`;
  }
  async function refresh(box) { try { const connection = await readConnection(); render(box, connection); if (connection?.status === 'pending') startPolling(box); } catch (error) { console.error('Upland connection status:', error); render(box, null); const msg = box.querySelector('#upland-connect-message'); if (msg) msg.textContent = 'Unable to load the Upland connection status right now.'; } }
  function startPolling(box) { stopPolling(); pollTimer = setInterval(async () => { try { const connection = await readConnection(); if (connection?.status === 'connected') render(box, connection); } catch (error) { console.warn('Upland connection polling:', error); } }, 3000); }
  async function startConnection() {
    const button = document.getElementById('upland-connect-button'); const message = document.getElementById('upland-connect-message');
    if (button) { button.disabled = true; button.textContent = 'Generating code...'; } if (message) message.textContent = '';
    try { const { data, error } = await db.functions.invoke(FUNCTION_NAME, { body: {} }); if (error) throw error; if (!data?.code) throw new Error(data?.error || 'Upland did not return a connection code.'); const box = document.getElementById('upland-account-card'); if (box) { render(box, { status:'pending', connection_code:data.code }); startPolling(box); } }
    catch (error) { console.error('Upland connection:', error); if (message) message.textContent = error?.message || 'Unable to generate an Upland connection code.'; if (button) { button.disabled = false; button.textContent = 'Connect Upland Account'; } }
  }
  function mount() {
    const dashboard = document.getElementById('nodehub-user-dashboard'); if (!dashboard) return;
    let box = document.getElementById('upland-account-card');
    if (!box) {
      const account = dashboard.querySelector('#user-account-info')?.closest('.auth-card'); if (!account) return;
      box = document.createElement('div'); box.id = 'upland-account-card'; box.className = 'auth-card'; box.style.marginBottom = '24px'; account.insertAdjacentElement('afterend', box);
    }
    if (!box.dataset.uplandInitialized) { box.dataset.uplandInitialized = '1'; refresh(box); }
  }
  function watch() { mount(); observer = new MutationObserver(mount); observer.observe(document.body, { childList:true, subtree:true }); window.addEventListener('hashchange', mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();

// Installer trigger marker: 2026-08-25 V1 Upland integration fix.
