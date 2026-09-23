(() => {
  "use strict";
  const money = new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 });
  const $ = (id) => document.getElementById(id);
  const state = { config: { upland_fee_bps: 0, node_hub_fee_bps: 0 }, enabled: false, isOwner: false };
  const fmt = (n) => `${money.format(Number(n || 0))} UPX`;
  const setText = (id, value) => { const el = $(id); if (el) el.textContent = value; };
  async function user() {
    const { data } = await window.db.auth.getSession();
    return data.session?.user || null;
  }
  async function loadAccess() {
    const current = await user();
    if (!current) { $("economy-access-message").textContent = "Sign in with an authorized account to use this private test area."; return null; }
    const [{ data: profile }, { data: config }] = await Promise.all([
      window.db.from("profiles").select("role").eq("id", current.id).maybeSingle(),
      window.db.from("economy_feature_flags").select("enabled,upland_fee_bps,node_hub_fee_bps").eq("key", "economy_test").maybeSingle()
    ]);
    state.isOwner = ["owner", "admin"].includes(profile?.role);
    state.config = config || state.config;
    state.enabled = Boolean(config?.enabled);
    if (!state.isOwner || !state.enabled) {
      $("economy-access-message").textContent = state.isOwner ? "Economy Test is disabled by its database feature flag." : "This private test area is restricted.";
      return null;
    }
    $("economy-access-message").textContent = "Sandbox feature flag enabled. No real UPX transfer can be made.";
    $("economy-app").hidden = false;
    $("economy-admin-panel").hidden = false;
    return current;
  }
  function quote() {
    const requested = Math.max(0, Math.floor(Number($("deposit-amount").value) || 0));
    const upland = Math.ceil(requested * Number(state.config.upland_fee_bps || 0) / 10000);
    const nodeHub = Math.ceil(requested * Number(state.config.node_hub_fee_bps || 0) / 10000);
    setText("requested-upx", fmt(requested)); setText("upland-fee", fmt(upland));
    setText("nodehub-fee", fmt(nodeHub)); setText("total-debit", fmt(requested + upland + nodeHub));
  }
  function rows(transactions) {
    const body = $("transactions-body");
    if (!transactions?.length) { body.innerHTML = "<tr><td colspan=\"5\">No transactions yet.</td></tr>"; return; }
    body.innerHTML = transactions.map((t) => `<tr><td>${new Date(t.created_at).toLocaleString()}</td><td>Deposit</td><td>${fmt(t.requested_upx)}</td><td>${fmt(Number(t.upland_fee_upx)+Number(t.node_hub_fee_upx))}</td><td><span class="status-label ${t.status}">${t.status}</span></td></tr>`).join("");
  }
  async function loadData(current) {
    const [{ data: account }, { data: transactions }] = await Promise.all([
      window.db.from("economy_player_accounts").select("available_upx,processing_upx").eq("user_id", current.id).maybeSingle(),
      window.db.from("economy_transactions").select("requested_upx,upland_fee_upx,node_hub_fee_upx,status,created_at").eq("user_id", current.id).order("created_at", { ascending: false }).limit(50)
    ]);
    setText("available-balance", fmt(account?.available_upx));
    setText("processing-balance", fmt(account?.processing_upx));
    rows(transactions);
    if (state.isOwner) {
      const { data: treasury } = await window.db.from("economy_treasury_balances").select("bucket,amount_upx");
      const values = Object.fromEntries((treasury || []).map((x) => [x.bucket, x.amount_upx]));
      setText("admin-player-liabilities", fmt(values.player_liabilities));
      setText("admin-in-transit", fmt(values.in_transit));
      setText("admin-nodehub-fees", fmt(values.node_hub_fees));
      setText("admin-treasury-cash", fmt(values.node_hub_cash));
    }
  }
  async function init() {
    if (!window.db) { $("economy-access-message").textContent = "Node Hub services are unavailable."; return; }
    try {
      const current = await loadAccess();
      quote(); $("deposit-amount").addEventListener("input", quote);
      if (current) await loadData(current);
    } catch (error) {
      console.error("Economy Test:", error);
      $("economy-access-message").textContent = "The protected test data could not be loaded.";
    }
  }
  document.addEventListener("DOMContentLoaded", init);
})();