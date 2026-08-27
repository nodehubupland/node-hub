const { SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const APP_ID = String(process.env.UPLAND_APP_ID || '').trim();
const APP_ACCESS_TOKEN = String(process.env.UPLAND_APP_ACCESS_TOKEN || '').trim();
const API_BASE = 'https://api.prod.upland.me/developers-api';
const CLIENT_ID = String(process.env.DISCORD_CLIENT_ID || '').trim();
const DISCORD_TOKEN = String(process.env.DISCORD_TOKEN || '').trim();
const GUILD_ID = String(process.env.DISCORD_GUILD_ID || '').trim();
const NODE_HUB_URL = 'https://nodehubupland.github.io/node-hub/#dashboard';
const PAGE_SIZE = 10;
const MAX_PAGES = 100;

function normalizeIgn(value) {
  return String(value || '').trim().replace(/^@/, '').replace(/\s+/g, '').toLowerCase();
}

function authHeader() {
  return `Basic ${Buffer.from(`${APP_ID}:${APP_ACCESS_TOKEN}`).toString('base64')}`;
}

async function uplandGet(path, params = {}) {
  if (!APP_ID || !APP_ACCESS_TOKEN) throw new Error('UPLAND_API_NOT_CONFIGURED');
  const url = new URL(`${API_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const response = await fetch(url, {
    method: 'GET',
    headers: { Authorization: authHeader(), Accept: 'application/json' },
    signal: AbortSignal.timeout(15000),
  });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { throw new Error('UPLAND_API_INVALID_JSON'); }
  if (!response.ok) {
    console.error(`UPLAND_API_ERROR:${response.status}:${path}:${url.search}:${text.slice(0, 300)}`);
    throw new Error(`UPLAND_API_${response.status}`);
  }
  return body;
}

function rowsFrom(body) {
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.results?.results)) return body.results.results;
  return [];
}

function metaFrom(body, page) {
  const source = body?.results && !Array.isArray(body.results) ? body.results : body;
  return {
    currentPage: Number(source?.currentPage || page),
    pageSize: Number(source?.pageSize || PAGE_SIZE),
    totalResults: Number(source?.totalResults || 0),
  };
}

async function fetchTreasureHistory() {
  const all = [];
  for (let page = 1; page <= MAX_PAGES; page++) {
    const body = await uplandGet('/treasures-history', { currentPage: page, pageSize: PAGE_SIZE });
    const rows = rowsFrom(body);
    all.push(...rows);
    const meta = metaFrom(body, page);
    if (!rows.length || rows.length < PAGE_SIZE) break;
    if (meta.totalResults > 0 && page >= Math.ceil(meta.totalResults / Math.max(meta.pageSize, 1))) break;
  }
  const unique = new Map();
  for (const row of all) {
    const key = `${row.userName || ''}|${row.lockedAt || ''}|${row.spawnAt || ''}|${row.reward || ''}|${row.fullAddress || ''}`;
    unique.set(key, row);
  }
  return [...unique.values()].sort((a, b) => new Date(b.lockedAt || b.spawnAt || 0) - new Date(a.lockedAt || a.spawnAt || 0));
}

async function fetchTreasureForPlayer(ign) {
  const target = normalizeIgn(ign);
  const history = await fetchTreasureHistory();
  return history.filter(row => normalizeIgn(row.userName) === target);
}

function reward(value) {
  return `${Number(value || 0).toLocaleString('en-US')} UPX`;
}

function resultEmbed(rows, ign) {
  const sorted = rows.slice().sort((a, b) => new Date(b.lockedAt || b.spawnAt || 0) - new Date(a.lockedAt || a.spawnAt || 0));
  const total = sorted.reduce((sum, row) => sum + Number(row.reward || 0), 0);
  return new EmbedBuilder()
    .setTitle('TREASURE HUNT RESULT')
    .setDescription([
      `**Player:** ${sorted[0]?.userName || ign}`,
      `**Treasures found:** ${sorted.length}`,
      `**Total rewards:** ${reward(total)}`,
      '',
      '**Recent history**',
      ...sorted.slice(0, 10).map((row, i) => `${i + 1}. ${reward(row.reward)} | ${row.treasureType || 'treasure'} | ${row.fullAddress || 'Unknown location'} | ${row.lockedAt ? new Date(row.lockedAt).toLocaleString('en-US') : 'Unknown date'}`),
    ].join('\n'))
    .setFooter({ text: 'Node Hub · Upland public API' })
    .setTimestamp();
}

function connectPrompt(ign) {
  return {
    content: `No public Treasure Hunt record was returned for **${ign}**. If this account is connected to Node Hub, wait for the Upland authorization to finish and run **/treasure** again.`,
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Connect Upland Account').setStyle(ButtonStyle.Link).setURL(NODE_HUB_URL))],
  };
}

async function registerCommands() {
  if (!CLIENT_ID || !DISCORD_TOKEN || !GUILD_ID) return;
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const commands = [
    new SlashCommandBuilder().setName('node-status').setDescription('Show Node Hub bot status.'),
    new SlashCommandBuilder().setName('treasure').setDescription('Look up public Treasure Hunt history for an Upland player.').addStringOption(o => o.setName('igname').setDescription('Upland IG Name.').setRequired(true)),
    new SlashCommandBuilder().setName('player-stats').setDescription('Show public Treasure Hunt statistics.').addStringOption(o => o.setName('igname').setDescription('Upland IG Name.').setRequired(true)),
  ].map(c => c.toJSON());
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
}

function setupUplandData(client) {
  client.once('ready', async () => {
    console.log(`UPLAND_V4_READY: appId=${Boolean(APP_ID)} accessToken=${Boolean(APP_ACCESS_TOKEN)} pageSize=${PAGE_SIZE}`);
    try { await registerCommands(); } catch (error) { console.error(`UPLAND_COMMAND_REGISTER_ERROR:${error.message}`); }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'node-status') {
      await interaction.reply({ content: `Node Hub Status\nDiscord: Online\nUpland API: ${APP_ID && APP_ACCESS_TOKEN ? 'Configured' : 'Not configured'}\nLatency: ${client.ws.ping}ms` });
      return;
    }
    if (!['treasure', 'player-stats'].includes(interaction.commandName)) return;
    const ign = interaction.options.getString('igname', true);
    await interaction.deferReply();
    try {
      const rows = await fetchTreasureForPlayer(ign);
      if (!rows.length) { await interaction.editReply(connectPrompt(ign)); return; }
      if (interaction.commandName === 'treasure') { await interaction.editReply({ embeds: [resultEmbed(rows, ign)] }); return; }
      const total = rows.reduce((sum, row) => sum + Number(row.reward || 0), 0);
      const best = rows.reduce((max, row) => Math.max(max, Number(row.reward || 0)), 0);
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('PLAYER STATS').setDescription([`**Player:** ${rows[0]?.userName || ign}`, `**Public treasures:** ${rows.length}`, `**Public rewards:** ${reward(total)}`, `**Average reward:** ${reward(total / rows.length)}`, `**Best reward:** ${reward(best)}`].join('\n')).setFooter({ text: 'Node Hub · Upland public API' }).setTimestamp()] });
    } catch (error) {
      console.error(`UPLAND_${interaction.commandName.toUpperCase()}_ERROR:${error.message}`);
      await interaction.editReply(`Unable to retrieve Upland data: ${error.message}`);
    }
  });
}

module.exports = { setupUplandData, fetchTreasureHistory, fetchTreasureForPlayer };
