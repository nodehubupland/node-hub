const { SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');

const UPLAND_APP_ID = process.env.UPLAND_APP_ID;
const UPLAND_SECRET_KEY = process.env.UPLAND_SECRET_KEY;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;

const CHANNELS = {
  treasureResults: 'treasure-results',
  dailyRanking: 'daily-ranking',
  playerStats: 'player-stats',
  listingAlerts: 'listing-alerts',
  uplandAlerts: 'upland-alerts',
  dataGuide: 'data-guide',
};

function normalizeIgn(value) {
  return String(value || '').trim().replace(/^@/, '').replace(/\s+/g, '').toLowerCase();
}
function basicAuth() { return 'Basic ' + Buffer.from(`${UPLAND_APP_ID}:${UPLAND_SECRET_KEY}`).toString('base64'); }
function findTextChannel(guild, name) { return guild.channels.cache.find(channel => channel.isTextBased?.() && channel.name === name); }

async function fetchTreasurePage(page = 1, pageSize = 100) {
  if (!UPLAND_APP_ID || !UPLAND_SECRET_KEY) throw new Error('UPLAND_API_NOT_CONFIGURED');
  const url = `https://api.prod.upland.me/developers-api/treasures-history?currentPage=${page}&pageSize=${pageSize}`;
  const response = await fetch(url, { headers: { Authorization: basicAuth(), Accept: 'application/json' } });
  if (!response.ok) throw new Error(`UPLAND_API_${response.status}`);
  const body = await response.json();
  return Array.isArray(body?.results) ? body.results : Array.isArray(body?.results?.results) ? body.results.results : [];
}
async function fetchRecentTreasures(maxPages = 10) {
  const rows = [];
  for (let page = 1; page <= maxPages; page++) {
    const results = await fetchTreasurePage(page, 100);
    if (!results.length) break;
    rows.push(...results);
    if (results.length < 100) break;
  }
  return rows;
}
function upx(value) { return `${Number(value || 0).toLocaleString('en-US')} UPX`; }
function treasureDate(row) { return new Date(row.lockedAt || row.spawnAt || 0); }
function dayKey(date = new Date()) { return date.toISOString().slice(0, 10); }
async function messageExists(channel, marker) {
  const recent = await channel.messages.fetch({ limit: 50 }).catch(() => null);
  return Boolean(recent?.some(message => message.author?.bot && message.embeds?.some(embed => String(embed.footer?.text || '').includes(marker))));
}

async function publishTreasureResults(guild, rows) {
  const channel = findTextChannel(guild, CHANNELS.treasureResults);
  if (!channel || !rows.length) return false;
  const latest = rows.slice().sort((a, b) => treasureDate(b) - treasureDate(a))[0];
  const marker = `NODEHUB_TREASURE:${latest.lockedAt || latest.spawnAt || ''}:${latest.userName || ''}:${latest.reward || 0}`;
  if (await messageExists(channel, marker)) return false;
  const embed = new EmbedBuilder().setTitle('TREASURE HUNT RESULTS').setDescription([
    `**Player:** ${latest.userName || 'Unknown'}`,
    `**Reward:** ${upx(latest.reward)}`,
    `**Type:** ${latest.treasureType || 'Unknown'}`,
    `**Location:** ${latest.fullAddress || 'Unknown'}`,
    `**Collected:** ${latest.lockedAt ? new Date(latest.lockedAt).toISOString() : 'Unknown'}`,
  ].join('\n')).setFooter({ text: marker }).setTimestamp();
  await channel.send({ embeds: [embed] });
  return true;
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
  const lines = ranking.map((item, index) => `**${index + 1}. ${item.username}** — ${upx(item.reward)} · ${item.treasures} treasure${item.treasures === 1 ? '' : 's'}`);
  const embed = new EmbedBuilder().setTitle(`DAILY TREASURE RANKING · ${today}`).setDescription(lines.join('\n')).setFooter({ text: marker }).setTimestamp();
  await channel.send({ embeds: [embed] });
  return true;
}

async function publishGuide(guild) {
  const channel = findTextChannel(guild, CHANNELS.dataGuide);
  if (!channel) return false;
  const marker = 'NODEHUB_DATA_GUIDE_V1';
  if (await messageExists(channel, marker)) return false;
  const embed = new EmbedBuilder().setTitle('UPLAND DATA GUIDE').setDescription([
    '**/treasure igname**',
    'Searches public Treasure Hunt history for an Upland player.',
    '',
    '**Data channels**',
    '`treasure-results` receives automatic Treasure Hunt results.',
    '`daily-ranking` receives the daily public Treasure ranking.',
    '`player-stats` provides public Treasure statistics for a player.',
    '`listing-alerts` is reserved for verified marketplace alerts.',
    '`upland-alerts` is reserved for verified Upland announcements and alerts.',
    '',
    '**Important**',
    'Only information available through authorized Upland data sources will be published. Private account data requires the player to authorize the Node Hub application.',
  ].join('\n')).setFooter({ text: marker }).setTimestamp();
  await channel.send({ embeds: [embed] });
  return true;
}

async function playerStats(ign) {
  const rows = await fetchRecentTreasures(10);
  const playerRows = rows.filter(row => normalizeIgn(row.userName) === normalizeIgn(ign));
  if (!playerRows.length) return new EmbedBuilder().setTitle('PLAYER STATS').setDescription(`No public Treasure Hunt data found for **${ign}**.`);
  const total = playerRows.reduce((sum, row) => sum + Number(row.reward || 0), 0);
  const types = new Map();
  for (const row of playerRows) {
    const type = row.treasureType || 'unknown';
    types.set(type, (types.get(type) || 0) + 1);
  }
  return new EmbedBuilder().setTitle('PLAYER STATS').setDescription([
    `**Player:** ${playerRows[0].userName}`,
    `**Public treasures found:** ${playerRows.length}`,
    `**Public rewards:** ${upx(total)}`,
    `**Treasure types:** ${[...types.entries()].map(([type, count]) => `${type}: ${count}`).join(' · ')}`,
    '',
    'These statistics are calculated only from public Treasure Hunt history.',
  ].join('\n'));
}

async function registerDataCommands() {
  if (!CLIENT_ID || !process.env.DISCORD_TOKEN || !GUILD_ID) return;
  const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  const command = new SlashCommandBuilder().setName('player-stats').setDescription('Show public Upland Treasure Hunt statistics for a player.').addStringOption(option => option.setName('igname').setDescription('Upland IG Name, exactly as shown in the game.').setRequired(true)).toJSON();
  const structuralCommands = new Set(['setup-server', 'post-rules', 'post-welcome']);
  const existing = await rest.get(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID));
  const filtered = existing.filter(item => !structuralCommands.has(item.name) && item.name !== 'player-stats');
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: [...filtered, command] });
}

function setupUplandData(client) {
  client.once('ready', async () => {
    try {
      await registerDataCommands();
      for (const guild of client.guilds.cache.values()) {
        await publishGuide(guild).catch(error => console.error('UPLAND_DATA_GUIDE_ERROR:', error.message));
        const rows = await fetchRecentTreasures(10).catch(error => { console.error('UPLAND_DATA_FETCH_ERROR:', error.message); return []; });
        if (!rows.length) continue;
        await publishTreasureResults(guild, rows).catch(error => console.error('UPLAND_TREASURE_PUBLISH_ERROR:', error.message));
        await publishDailyRanking(guild, rows).catch(error => console.error('UPLAND_RANKING_PUBLISH_ERROR:', error.message));
      }
    } catch (error) { console.error('UPLAND_DATA_INIT_ERROR:', error.message); }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'player-stats') return;
    const ign = interaction.options.getString('igname', true);
    await interaction.deferReply();
    try { await interaction.editReply({ embeds: [await playerStats(ign)] }); }
    catch (error) { await interaction.editReply(`Unable to retrieve public player data right now. ${error.message}`); }
  });

  setInterval(async () => {
    for (const guild of client.guilds.cache.values()) {
      try {
        const rows = await fetchRecentTreasures(10);
        if (!rows.length) continue;
        await publishTreasureResults(guild, rows);
        await publishDailyRanking(guild, rows);
      } catch (error) { console.error('UPLAND_DATA_SCHEDULE_ERROR:', error.message); }
    }
  }, 15 * 60 * 1000);
}

module.exports = { setupUplandData };
