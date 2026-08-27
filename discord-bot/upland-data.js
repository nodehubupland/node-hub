const fs = require('fs');
const path = require('path');

const { SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');

const APP_ID = String(process.env.UPLAND_APP_ID || '').trim();
const APP_ACCESS_TOKEN = String(process.env.UPLAND_APP_ACCESS_TOKEN || '').trim();
const API_BASE = 'https://api.prod.upland.me/developers-api';
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_TOKEN = process.env.DISCORD_TOKEN;

const CHANNELS = {
  treasureResults: ['treasure-results', '📊-treasure-results'],
  dailyRanking: ['daily-ranking', '🏆-daily-ranking'],
  playerStats: ['player-stats', '👤-player-stats'],
  listingAlerts: ['listing-alerts', '🚨-listing-alerts'],
  uplandAlerts: ['upland-alerts'],
  dataGuide: ['data-guide', '📚-data-guide'],
};

const STATE_FILE = path.join(__dirname, 'upland-data-state.json');

function loadState() {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { return { treasureKeys: [], lastPollAt: null }; }
}

function saveState(state) {
  try { fs.writeFileSync(STATE_FILE, JSON.stringify(state)); } catch (error) { console.error('UPLAND_STATE_SAVE_ERROR:', error.message); }
}

function normalizeIgn(value) {
  return String(value || '').trim().replace(/^@/, '').replace(/\s+/g, '').toLowerCase();
}

function basicAuth() {
  return `Basic ${Buffer.from(`${APP_ID}:${APP_ACCESS_TOKEN}`).toString('base64')}`;
}

function channelMatches(actual, candidates) {
  const value = String(actual || '').toLowerCase();
  return candidates.some(candidate => {
    const wanted = String(candidate).toLowerCase();
    return value === wanted || value.endsWith(`-${wanted}`) || value.replace(/[^a-z0-9-]/g, '').endsWith(wanted.replace(/[^a-z0-9-]/g, ''));
  });
}

function findTextChannel(guild, candidates) {
  return guild.channels.cache.find(channel => channel.isTextBased?.() && channel.type !== 4 && channelMatches(channel.name, candidates));
}

async function uplandGet(pathname, params = {}) {
  if (!APP_ID || !APP_ACCESS_TOKEN) throw new Error('UPLAND_API_NOT_CONFIGURED');
  const url = new URL(`${API_BASE}${pathname}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, { method: 'GET', headers: { Authorization: basicAuth(), Accept: 'application/json' }, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      console.error(`UPLAND_API_ERROR:${response.status}:${pathname}:${text.slice(0, 500)}`);
      if (response.status === 401) throw new Error('UPLAND_API_UNAUTHORIZED');
      if (response.status === 403) throw new Error('UPLAND_API_FORBIDDEN');
      if (response.status === 429) throw new Error('UPLAND_API_RATE_LIMITED');
      throw new Error(`UPLAND_API_${response.status}`);
    }
    try { return JSON.parse(text); } catch { throw new Error('UPLAND_API_INVALID_JSON'); }
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('UPLAND_API_TIMEOUT');
    throw error;
  } finally { clearTimeout(timeout); }
}

function unwrapResults(body) {
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.results?.results)) return body.results.results;
  return [];
}

async function testUplandConnection() {
  const cities = await uplandGet('/cities');
  return Array.isArray(cities?.cities) ? cities.cities : unwrapResults(cities);
}

async function fetchTreasurePage(page = 1, pageSize = 10) {
  return unwrapResults(await uplandGet('/treasures-history', { currentPage: page, pageSize }));
}

async function fetchRecentTreasures(maxPages = 10) {
  const rows = [];
  for (let page = 1; page <= maxPages; page++) {
    const results = await fetchTreasurePage(page, 10);
    if (!results.length) break;
    rows.push(...results);
    if (results.length < 10) break;
  }
  return rows;
}

async function fetchCities() {
  const body = await uplandGet('/cities');
  return Array.isArray(body?.cities) ? body.cities : unwrapResults(body);
}

async function fetchCollections() {
  return unwrapResults(await uplandGet('/collections'));
}

function upx(value) { return `${Number(value || 0).toLocaleString('en-US')} UPX`; }
function treasureDate(row) { return new Date(row.lockedAt || row.spawnAt || 0); }
function dayKey(date = new Date()) { return date.toISOString().slice(0, 10); }
function treasureKey(row) { return `${row.userName || ''}|${row.lockedAt || ''}|${row.spawnAt || ''}|${row.reward || ''}|${row.fullAddress || ''}`; }

async function messageExists(channel, marker) {
  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  return Boolean(recent?.some(message => message.author?.bot && message.embeds?.some(embed => String(embed.footer?.text || '').includes(marker))));
}

async function publishTreasureRow(channel, row, state) {
  const key = treasureKey(row);
  const marker = `NODEHUB_TREASURE:${key}`;
  if (state.treasureKeys.includes(key)) return false;
  if (await messageExists(channel, marker)) {
    state.treasureKeys.push(key);
    return false;
  }
  const embed = new EmbedBuilder().setTitle('TREASURE HUNT RESULTS').setDescription([
    `**Player:** ${row.userName || 'Unknown'}`,
    `**Reward:** ${upx(row.reward)}`,
    `**Type:** ${row.treasureType || 'Unknown'}`,
    `**Location:** ${row.fullAddress || 'Unknown'}`,
    `**Collected:** ${row.lockedAt ? new Date(row.lockedAt).toISOString() : 'Unknown'}`,
  ].join('\n')).setFooter({ text: marker }).setTimestamp();
  await channel.send({ embeds: [embed] });
  state.treasureKeys.push(key);
  state.treasureKeys = state.treasureKeys.slice(-5000);
  return true;
}

async function publishTreasureResults(guild, rows, initialSync = false) {
  const channel = findTextChannel(guild, CHANNELS.treasureResults);
  if (!channel || !rows.length) return false;
  const state = loadState();
  const ordered = rows.slice().sort((a, b) => treasureDate(b) - treasureDate(a));
  const candidates = initialSync ? ordered.slice(0, 10) : ordered.slice(0, 3);
  let published = false;
  for (const row of candidates) {
    published = await publishTreasureRow(channel, row, state) || published;
  }
  saveState(state);
  return published;
}

async function publishDailyRanking(guild, rows) {
  const channel = findTextChannel(guild, CHANNELS.dailyRanking);
  if (!channel) return false;
  const today = dayKey();
  const todayRows = rows.filter(row => dayKey(treasureDate(row)) === today);
  if (!todayRows.length) return false;
  const totals = new Map();
  for (const row of todayRows) {
    const username = row.userName || 'Unknown';
    const key = normalizeIgn(username);
    const current = totals.get(key) || { username, reward: 0, treasures: 0 };
    current.reward += Number(row.reward || 0);
    current.treasures += 1;
    totals.set(key, current);
  }
  const ranking = [...totals.values()].sort((a, b) => b.reward - a.reward).slice(0, 10);
  const marker = `NODEHUB_DAILY_RANKING:${today}`;
  if (await messageExists(channel, marker)) return false;
  const lines = ranking.map((item, index) => `**${index + 1}. ${item.username}** | ${upx(item.reward)} | ${item.treasures} treasure${item.treasures === 1 ? '' : 's'}`);
  await channel.send({ embeds: [new EmbedBuilder().setTitle(`DAILY TREASURE RANKING · ${today}`).setDescription(lines.join('\n')).setFooter({ text: marker }).setTimestamp()] });
  return true;
}

async function publishGuide(guild) {
  const channel = findTextChannel(guild, CHANNELS.dataGuide);
  if (!channel) return false;
  const marker = 'NODEHUB_DATA_GUIDE_V5';
  if (await messageExists(channel, marker)) return false;
  const embed = new EmbedBuilder().setTitle('UPLAND DATA GUIDE').setDescription([
    '**/treasure**', 'Informe o IG Name do jogador no campo `igname` para consultar o histórico público de Treasure Hunt.', '',
    '**/player-stats**', 'Informe o IG Name para consultar estatísticas públicas de Treasure Hunt.', '',
    '**/upland-cities**', 'Lista cidades disponíveis na API pública do Upland.', '',
    '**/upland-collections**', 'Lista collections disponíveis na API pública.', '',
    '**Canais de dados**', '`treasure-results` recebe resultados automáticos.', '`daily-ranking` recebe o ranking diário.', '`player-stats` é reservado para dados e estatísticas de jogadores.', '`listing-alerts` fica reservado para listings verificados.', '`upland-alerts` fica reservado para alertas verificados do Upland.',
  ].join('\n')).setFooter({ text: marker }).setTimestamp();
  await channel.send({ embeds: [embed] });
  return true;
}

async function playerStats(ign) {
  const rows = await fetchRecentTreasures(10);
  const playerRows = rows.filter(row => normalizeIgn(row.userName) === normalizeIgn(ign));
  if (!playerRows.length) return new EmbedBuilder().setTitle('PLAYER STATS').setDescription(`No public Treasure Hunt data found for **${ign}**.`);
  const total = playerRows.reduce((sum, row) => sum + Number(row.reward || 0), 0);
  const average = total / playerRows.length;
  const best = playerRows.reduce((max, row) => Math.max(max, Number(row.reward || 0)), 0);
  return new EmbedBuilder().setTitle('PLAYER STATS').setDescription([
    `**Player:** ${playerRows[0].userName}`,
    `**Public treasures:** ${playerRows.length}`,
    `**Public rewards:** ${upx(total)}`,
    `**Average reward:** ${upx(average)}`,
    `**Best reward:** ${upx(best)}`,
    '',
    'Statistics are calculated only from public Treasure Hunt history returned by Upland.',
  ].join('\n'));
}

async function registerDataCommands() {
  if (!CLIENT_ID || !DISCORD_TOKEN || !GUILD_ID) return;
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const commands = [
    new SlashCommandBuilder().setName('node-status').setDescription('Show Node Hub bot status.'),
    new SlashCommandBuilder().setName('treasure').setDescription('Consultar histórico público de Treasure Hunt.').addStringOption(option => option.setName('igname').setDescription('IG Name do jogador.').setRequired(true)),
    new SlashCommandBuilder().setName('player-stats').setDescription('Consultar estatísticas públicas do jogador.').addStringOption(option => option.setName('igname').setDescription('IG Name do jogador.').setRequired(true)),
    new SlashCommandBuilder().setName('upland-cities').setDescription('Listar cidades públicas do Upland.'),
    new SlashCommandBuilder().setName('upland-collections').setDescription('Listar collections públicas do Upland.'),
  ].map(command => command.toJSON());
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log('UPLAND_COMMANDS_REGISTERED');
}

async function runDataSync(client, initialSync = false) {
  const rows = await fetchRecentTreasures(10);
  console.log(`UPLAND_TREASURE_HISTORY_OK: returned ${rows.length} records`);
  for (const guild of client.guilds.cache.values()) {
    await publishTreasureResults(guild, rows, initialSync).catch(error => console.error('UPLAND_TREASURE_PUBLISH_ERROR:', error.message));
    await publishDailyRanking(guild, rows).catch(error => console.error('UPLAND_RANKING_PUBLISH_ERROR:', error.message));
  }
}

function setupUplandData(client) {
  client.once('ready', async () => {
    console.log(`UPLAND_CONFIG: appIdPresent=${Boolean(APP_ID)} accessTokenPresent=${Boolean(APP_ACCESS_TOKEN)} endpoint=${API_BASE}`);
    try {
      await registerDataCommands();
      const cities = await testUplandConnection();
      console.log(`UPLAND_API_AUTH_OK: /cities returned ${cities.length} cities`);
      await runDataSync(client, true);
      for (const guild of client.guilds.cache.values()) await publishGuide(guild).catch(error => console.error('UPLAND_DATA_GUIDE_ERROR:', error.message));
      setInterval(() => runDataSync(client, false).catch(error => console.error('UPLAND_SYNC_ERROR:', error.message)), 5 * 60 * 1000);
    } catch (error) { console.error(`UPLAND_API_BOOTSTRAP_FAILED:${error.message}`); }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'node-status') {
      await interaction.reply({ content: `Node Hub Status\nDiscord: Online\nUpland API: ${APP_ID && APP_ACCESS_TOKEN ? 'Configured' : 'Not configured'}\nLatency: ${client.ws.ping}ms` });
      return;
    }
    if (interaction.commandName === 'treasure') {
      const ign = normalizeIgn(interaction.options.getString('igname', true));
      await interaction.deferReply();
      try {
        const rows = (await fetchRecentTreasures(10)).filter(row => normalizeIgn(row.userName) === ign);
        if (!rows.length) return interaction.editReply(`No public Treasure Hunt history found for **${ign}**.`);
        const total = rows.reduce((sum, row) => sum + Number(row.reward || 0), 0);
        const recent = rows.slice().sort((a, b) => treasureDate(b) - treasureDate(a)).slice(0, 10);
        await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('TREASURE HUNT RESULT').setDescription([
          `**Player:** ${rows[0].userName}`, `**Public rewards:** ${upx(total)}`, `**Treasures:** ${rows.length}`, '', '**Recent history**',
          ...recent.map((row, index) => `${index + 1}. ${upx(row.reward)} | ${row.treasureType || 'treasure'} | ${row.fullAddress || 'Unknown location'}`),
        ].join('\n')).setTimestamp()] });
      } catch (error) { console.error(`UPLAND_TREASURE_COMMAND_ERROR:${error.message}`); await interaction.editReply(`Unable to retrieve Upland data: ${error.message}`); }
      return;
    }
    if (interaction.commandName === 'player-stats') {
      const ign = interaction.options.getString('igname', true);
      await interaction.deferReply();
      try { await interaction.editReply({ embeds: [await playerStats(ign)] }); } catch (error) { await interaction.editReply(`Unable to retrieve Upland data: ${error.message}`); }
      return;
    }
    if (interaction.commandName === 'upland-cities') {
      await interaction.deferReply();
      try { const cities = await fetchCities(); await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('UPLAND CITIES').setDescription(cities.slice(0, 30).map(city => `**${city.name || city.id}**${city.stateName ? ` | ${city.stateName}` : ''}`).join('\n') || 'No cities returned.')] }); } catch (error) { await interaction.editReply(`Unable to retrieve Upland data: ${error.message}`); }
      return;
    }
    if (interaction.commandName === 'upland-collections') {
      await interaction.deferReply();
      try { const collections = await fetchCollections(); await interaction.editReply({ embeds: [new EmbedBuilder().setTitle('UPLAND COLLECTIONS').setDescription(collections.slice(0, 30).map(item => `**${item.name || item.id || 'Collection'}**`).join('\n') || 'No collections returned.')] }); } catch (error) { await interaction.editReply(`Unable to retrieve Upland data: ${error.message}`); }
    }
  });
}

module.exports = { setupUplandData, uplandGet, fetchRecentTreasures, fetchCities, fetchCollections };