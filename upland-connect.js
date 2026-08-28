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
  function copyCode(code, button) {
    if (!code) return;
    const done = () => {
      if (!button) return;
      const original = button.textContent;
      button.textContent = 'Copied';
      setTimeout(() => { button.textContent = original; }, 1600);
    };
    if (navigator.clipboard?.writeText) navigator.clipboard.writeText(code).then(done).catch(() => fallbackCopy(code, done));
    else fallbackCopy(code, done);
  }
  function fallbackCopy(code, done) {
    const input = document.createElement('textarea');
    input.value = code; input.setAttribute('readonly',''); input.style.position='fixed'; input.style.opacity='0';
    document.body.appendChild(input); input.select();
    try { document.execCommand('copy'); done(); } catch (e) { console.warn('Copy connection code failed:', e); }
    input.remove();
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
    const code = connection.connection_code || '';
    box.innerHTML = `<span class="eyebrow">UPLAND ACCOUNT</span><h2 style="margin-top:8px">Connect Upland Account</h2><p>Generate the code, copy it, follow the steps below in Upland, then return to Node Hub.</p><div style="display:flex;align-items:center;justify-content:center;gap:10px;flex-wrap:wrap;margin:18px 0"><div style="font-size:clamp(28px,6vw,44px);font-weight:800;letter-spacing:.16em;text-align:center;padding:18px 20px;border:1px solid rgba(255,255,255,.12);border-radius:14px;background:rgba(255,255,255,.04)">${esc(code)}</div><button id="upland-copy-code" class="button button-secondary" type="button">Copy Code</button></div><div style="margin-top:22px;padding:18px;border:1px solid rgba(255,255,255,.08);border-radius:14px;background:rgba(255,255,255,.025);text-align:left"><strong style="display:block;margin-bottom:12px">How to connect your Upland account</strong><ol style="margin:0;padding-left:22px;line-height:1.8"><li>Open <strong>Upland</strong>.</li><li>Go to <strong>Settings</strong>.</li><li>Open <strong>Third-party applications</strong>.</li><li>Enter the connection code shown above.</li><li>Confirm and authorize <strong>Node Hub</strong>.</li><li>Return to Node Hub and wait for the connection to be confirmed.</li></ol></div><p id="upland-waiting-message" style="opacity:.75;margin-top:16px">Waiting for Upland to confirm the connection...</p>`;
    box.querySelector('#upland-copy-code')?.addEventListener('click', () => copyCode(code, box.querySelector('#upland-copy-code')));
  }
  async function refresh(box) {
    try {
      const connection = await readConnection();
      render(box, connection);
      if (connection?.status === 'pending') startPolling(box);
    } catch (error) {
      console.error('Upland connection status:', error);
      const msg = box.querySelector('#upland-waiting-message') || box.querySelector('#upland-connect-message');
      if (msg) msg.textContent = 'Unable to load the Upland connection status right now. Retrying...';
      startPolling(box);
    }
  }
  function startPolling(box) {
    stopPolling();
    pollTimer = setInterval(async () => {
      try {
        const connection = await readConnection();
        if (connection?.status === 'connected' || connection?.status === 'failed' || connection?.status === 'disconnected') {
          render(box, connection);
        }
      } catch (error) { console.warn('Upland connection polling:', error); }
    }, 2000);
  }
  async function startConnection() {
    const button = document.getElementById('upland-connect-button'); const message = document.getElementById('upland-connect-message');
    if (button) { button.disabled = true; button.textContent = 'Generating code...'; } if (message) message.textContent = '';
    try { const { data, error } = await db.functions.invoke(FUNCTION_NAME, { body: {} }); if (error) throw error; if (!data?.code) throw new Error(data?.error || 'Upland did not return a connection code.'); const box = document.getElementById('upland-account-card'); if (box) { render(box, { status:'pending', connection_code:data.code }); startPolling(box); } }
    catch (error) { console.error('Upland connection:', error); if (message) message.textContent = error?.message || 'Unable to generate an Upland connection code.'; if (button) { button.disabled = false; button.textContent = 'Connect Upland Account'; } }
  }
  function mount() {
    const dashboard = document.getElementById('nodehub-user-dashboard'); if (!dashboard) return;
    const box = document.getElementById('upland-account-card');
    if (!box) return;
    if (!box.dataset.uplandInitialized) { box.dataset.uplandInitialized = '1'; refresh(box); }
  }
  window.__nodehubUplandMount = mount;
  function watch() { mount(); if (observer) observer.disconnect(); observer = new MutationObserver(mount); observer.observe(document.body, { childList:true, subtree:true }); window.addEventListener('hashchange', mount); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', watch); else watch();
})();

// Installer trigger marker: 2026-08-28 V1 dashboard organization + Upland copy/tutorial/status refresh.