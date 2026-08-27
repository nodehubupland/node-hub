const { SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const APP_ID = String(process.env.UPLAND_APP_ID || '').trim();
const APP_ACCESS_TOKEN = String(process.env.UPLAND_APP_ACCESS_TOKEN || '').trim();
const API_BASE = 'https://api.prod.upland.me/developers-api';
const CLIENT_ID = String(process.env.DISCORD_CLIENT_ID || '').trim();
const DISCORD_TOKEN = String(process.env.DISCORD_TOKEN || '').trim();
const GUILD_ID = String(process.env.DISCORD_GUILD_ID || '').trim();
const NODE_HUB_URL = 'https://nodehubupland.github.io/node-hub/#dashboard';

function normalizeIgn(value) {
  return String(value || '').trim().replace(/^@/, '').replace(/\s+/g, '').toLowerCase();
}

function authHeader() {
  return `Basic ${Buffer.from(`${APP_ID}:${APP_ACCESS_TOKEN}`).toString('base64')}`;
}

async function uplandGet(path, params = {}, bearer = '') {
  if (!APP_ID || !APP_ACCESS_TOKEN) throw new Error('UPLAND_API_NOT_CONFIGURED');
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
  });
  const headers = { Accept: 'application/json', Authorization: bearer ? `Bearer ${bearer}` : authHeader() };
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch { body = null; }
  if (!response.ok) throw new Error(`UPLAND_API_${response.status}`);
  return body;
}

function rowsFrom(body) {
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.results?.results)) return body.results.results;
  return [];
}

async function fetchTreasureForPlayer(ign) {
  const normalized = normalizeIgn(ign);
  const attempts = [
    { userName: ign },
    { username: ign },
  ];

  for (const params of attempts) {
    try {
      const body = await uplandGet('/treasures-history', { currentPage: 1, pageSize: 100, ...params });
      const rows = rowsFrom(body).filter(row => normalizeIgn(row.userName) === normalized);
      if (rows.length) return rows;
    } catch (error) {
      console.error(`UPLAND_TREASURE_LOOKUP:${Object.keys(params)[0]}:${error.message}`);
    }
  }

  const collected = [];
  for (let page = 1; page <= 20; page++) {
    const body = await uplandGet('/treasures-history', { currentPage: page, pageSize: 100 });
    const rows = rowsFrom(body);
    if (!rows.length) break;
    collected.push(...rows.filter(row => normalizeIgn(row.userName) === normalized));
    if (rows.length < 100) break;
    if (collected.length) break;
  }
  return collected;
}

function reward(value) {
  return `${Number(value || 0).toLocaleString('en-US')} UPX`;
}

function dateOf(row) {
  return new Date(row.lockedAt || row.spawnAt || 0);
}

function resultEmbed(rows, ign) {
  const sorted = rows.slice().sort((a, b) => dateOf(b) - dateOf(a));
  const total = sorted.reduce((sum, row) => sum + Number(row.reward || 0), 0);
  const lines = sorted.slice(0, 10).map((row, i) => `${i + 1}. ${reward(row.reward)} | ${row.treasureType || 'treasure'} | ${row.fullAddress || 'Unknown location'} | ${row.lockedAt ? new Date(row.lockedAt).toLocaleString('en-US') : 'Unknown date'}`);
  return new EmbedBuilder()
    .setTitle('TREASURE HUNT RESULT')
    .setDescription([`**Player:** ${sorted[0]?.userName || ign}`, `**Treasures found:** ${sorted.length}`, `**Total rewards:** ${reward(total)}`, '', '**History**', ...lines].join('\n'))
    .setFooter({ text: 'Node Hub · Upland' })
    .setTimestamp();
}

function connectPrompt(ign) {
  return {
    content: `No public Treasure Hunt record was returned for **${ign}**. If this player has connected their Upland account to Node Hub, use the connection below and run **/treasure** again after authorization.`,
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
    console.log(`UPLAND_V3_READY: appId=${Boolean(APP_ID)} accessToken=${Boolean(APP_ACCESS_TOKEN)}`);
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
      if (!rows.length) {
        await interaction.editReply(connectPrompt(ign));
        return;
      }
      if (interaction.commandName === 'treasure') {
        await interaction.editReply({ embeds: [resultEmbed(rows, ign)] });
        return;
      }
      const total = rows.reduce((sum, row) => sum + Number(row.reward || 0), 0);
      const best = rows.reduce((max, row) => Math.max(max, Number(row.reward || 0)), 0);
      await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('PLAYER STATS').setDescription([`**Player:** ${rows[0].userName || ign}`, `**Public treasures:** ${rows.length}`, `**Public rewards:** ${reward(total)}`, `**Average reward:** ${reward(total / rows.length)}`, `**Best reward:** ${reward(best)}`].join('\n')).setTimestamp()] });
    } catch (error) {
      console.error(`UPLAND_${interaction.commandName.toUpperCase()}_ERROR:${error.message}`);
      await interaction.editReply(`Unable to retrieve Upland data: ${error.message}`);
    }
  });
}

module.exports = { setupUplandData, fetchTreasureForPlayer };
