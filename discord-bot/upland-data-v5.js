const { SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const APP_ID = String(process.env.UPLAND_APP_ID || '').trim();
// Upland's current production application credential. Prefer the Application Access Token.
const APPLICATION_ACCESS_TOKEN = String(process.env.UPLAND_APP_ACCESS_TOKEN || '').trim();
// Legacy fallback kept only for compatibility with an older Render configuration.
const LEGACY_SECRET_KEY = String(process.env.UPLAND_SECRET_KEY || '').trim();
const APPLICATION_CREDENTIAL = APPLICATION_ACCESS_TOKEN || LEGACY_SECRET_KEY;
const CLIENT_ID = String(process.env.DISCORD_CLIENT_ID || '').trim();
const DISCORD_TOKEN = String(process.env.DISCORD_TOKEN || '').trim();
const GUILD_ID = String(process.env.DISCORD_GUILD_ID || '').trim();
const API_BASE = 'https://api.prod.upland.me/developers-api';

function normalizeIgn(value) {
  return String(value || '').trim().replace(/^@/, '').replace(/\s+/g, '').toLowerCase();
}
function basicAuth() {
  return `Basic ${Buffer.from(`${APP_ID}:${APPLICATION_CREDENTIAL}`).toString('base64')}`;
}
async function uplandGet(path, params = {}) {
  if (!APP_ID || !APPLICATION_CREDENTIAL) throw new Error('UPLAND_CREDENTIALS_MISSING');
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k,v]) => { if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v)); });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const r = await fetch(url, { headers: { Authorization: basicAuth(), Accept: 'application/json' }, signal: controller.signal });
    const text = await r.text();
    if (!r.ok) throw new Error(`UPLAND_API_${r.status}:${text.slice(0,300)}`);
    return text ? JSON.parse(text) : {};
  } catch (e) {
    if (e.name === 'AbortError') throw new Error('UPLAND_API_TIMEOUT');
    throw e;
  } finally { clearTimeout(timer); }
}
function unwrap(body) {
  if (Array.isArray(body?.results?.results)) return body.results.results;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body)) return body;
  return [];
}
function meta(body, page, size) {
  const source = body?.results && !Array.isArray(body.results) ? body.results : body;
  return { totalResults: Number(source?.totalResults || body?.totalResults || 0), currentPage: Number(source?.currentPage || body?.currentPage || page), pageSize: Number(source?.pageSize || body?.pageSize || size) };
}
async function fetchTreasureHistory(cityId = '') {
  const all = [];
  let page = 1;
  const pageSize = 100;
  while (page <= 100) {
    const body = await uplandGet('/treasures-history', { currentPage: page, pageSize, ...(cityId ? { cityId } : {}) });
    const rows = unwrap(body);
    const m = meta(body, page, pageSize);
    all.push(...rows);
    if (!rows.length || rows.length < pageSize || (m.totalResults > 0 && page >= Math.ceil(m.totalResults / Math.max(m.pageSize,1)))) break;
    page += 1;
  }
  const unique = new Map();
  for (const r of all) unique.set(`${r.userName||''}|${r.lockedAt||''}|${r.spawnAt||''}|${r.reward||''}|${r.fullAddress||''}`, r);
  return [...unique.values()].sort((a,b) => new Date(b.lockedAt || b.spawnAt || 0) - new Date(a.lockedAt || a.spawnAt || 0));
}
function embed(rows, ign) {
  const total = rows.reduce((s,r) => s + Number(r.reward || 0), 0);
  const lines = rows.slice(0, 10).map((r,i) => `**${i+1}.** ${Number(r.reward||0).toLocaleString('en-US')} UPX • ${r.treasureType || 'treasure'}\n${r.fullAddress || 'Address unavailable'}\n${r.lockedAt || r.spawnAt || 'Date unavailable'}`);
  return new EmbedBuilder().setTitle('TREASURE HUNT RESULT').setDescription(`**Player:** ${rows[0]?.userName || ign}\n**Treasures found:** ${rows.length}\n**Total rewards:** ${total.toLocaleString('en-US')} UPX\n\n**Recent history**\n${lines.join('\n\n')}`.slice(0,4096)).setFooter({ text: 'Node Hub · Upland public Developers API' }).setTimestamp();
}
async function register() {
  if (!CLIENT_ID || !DISCORD_TOKEN || !GUILD_ID) return;
  const rest = new REST({version:'10'}).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID,GUILD_ID), { body: [new SlashCommandBuilder().setName('treasure').setDescription('Show public Upland Treasure Hunt history for a player').addStringOption(o=>o.setName('ign').setDescription('Upland IGN').setRequired(true)).addStringOption(o=>o.setName('cityid').setDescription('Optional Upland city ID').setRequired(false)).toJSON()] });
}
async function setupUplandData(client) {
  await register().catch(e=>console.error('UPLAND_COMMAND_REGISTER_ERROR:',e));
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'treasure') return;
    const ign = normalizeIgn(interaction.options.getString('ign',true));
    const cityId = interaction.options.getString('cityid',false) || '';
    await interaction.deferReply();
    try {
      const rows = (await fetchTreasureHistory(cityId)).filter(r => normalizeIgn(r.userName) === ign);
      if (!rows.length) return interaction.editReply({content:`No public Treasure Hunt history found for **${ign}**. The Upland API returned no matching record in the queried history.`});
      await interaction.editReply({embeds:[embed(rows,ign)]});
    } catch (e) {
      console.error(`TREASURE_COMMAND_ERROR:${ign}:`,e);
      await interaction.editReply({content:`Unable to retrieve Upland Treasure Hunt data: **${e.message}**`});
    }
  });
}
module.exports = { setupUplandData, fetchTreasureHistory };