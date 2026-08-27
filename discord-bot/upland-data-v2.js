const { SlashCommandBuilder, REST, Routes, EmbedBuilder, ChannelType } = require('discord.js');

const APP_ID = String(process.env.UPLAND_APP_ID || '').trim();
const APP_ACCESS_TOKEN = String(process.env.UPLAND_APP_ACCESS_TOKEN || '').trim();
const API_BASE = 'https://api.prod.upland.me/developers-api';
const GUILD_ID = String(process.env.DISCORD_GUILD_ID || '').trim();
const CLIENT_ID = String(process.env.DISCORD_CLIENT_ID || '').trim();
const DISCORD_TOKEN = String(process.env.DISCORD_TOKEN || '').trim();

const TREASURE_CHANNELS = ['treasure-results', '📊-treasure-results'];
const RANKING_CHANNELS = ['daily-ranking', '🏆-daily-ranking'];
const PAGE_SIZE = 100;
const MAX_PAGES_PER_CITY = 20;

function normalizeIgn(value) {
  return String(value || '').trim().replace(/^@/, '').replace(/\s+/g, '').toLowerCase();
}

function basicAuth() {
  return `Basic ${Buffer.from(`${APP_ID}:${APP_ACCESS_TOKEN}`).toString('base64')}`;
}

function unwrapTreasureResponse(body) {
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body?.results?.results)) return body.results.results;
  return [];
}

function responseMeta(body, page, pageSize) {
  return {
    totalResults: Number(body?.totalResults || body?.results?.totalResults || 0),
    currentPage: Number(body?.currentPage || body?.results?.currentPage || page),
    pageSize: Number(body?.pageSize || body?.results?.pageSize || pageSize),
  };
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
    const response = await fetch(url, {
      method: 'GET',
      headers: { Authorization: basicAuth(), Accept: 'application/json' },
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) {
      console.error(`UPLAND_API_ERROR:${response.status}:${pathname}:${url.search}:${text.slice(0, 500)}`);
      throw new Error(`UPLAND_API_${response.status}`);
    }
    return JSON.parse(text);
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('UPLAND_API_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchCities() {
  const body = await uplandGet('/cities');
  const cities = Array.isArray(body?.cities) ? body.cities : Array.isArray(body?.results) ? body.results : [];
  if (!cities.length) throw new Error('UPLAND_CITIES_EMPTY');
  return cities;
}

async function fetchTreasurePage(cityId, page, pageSize = PAGE_SIZE) {
  const body = await uplandGet('/treasures-history', {
    currentPage: page,
    pageSize,
    cityId,
  });
  return {
    rows: unwrapTreasureResponse(body),
    ...responseMeta(body, page, pageSize),
  };
}

async function fetchTreasureHistory() {
  const cities = await fetchCities();
  const all = [];
  let successfulCities = 0;
  let failedCities = 0;

  for (const city of cities) {
    const cityId = city?.id;
    if (cityId === undefined || cityId === null) continue;

    try {
      const first = await fetchTreasurePage(cityId, 1, PAGE_SIZE);
      successfulCities += 1;
      all.push(...first.rows);

      const totalPages = first.totalResults > 0
        ? Math.ceil(first.totalResults / Math.max(first.pageSize, 1))
        : (first.rows.length >= PAGE_SIZE ? MAX_PAGES_PER_CITY : 1);
      const pages = Math.min(Math.max(totalPages, 1), MAX_PAGES_PER_CITY);

      for (let page = 2; page <= pages; page++) {
        const result = await fetchTreasurePage(cityId, page, PAGE_SIZE);
        if (!result.rows.length) break;
        all.push(...result.rows);
        if (result.rows.length < PAGE_SIZE) break;
      }
    } catch (error) {
      failedCities += 1;
      console.error(`UPLAND_TREASURE_CITY_ERROR:${cityId}:${error.message}`);
    }
  }

  const unique = new Map();
  for (const row of all) {
    const key = `${row.userName || ''}|${row.lockedAt || ''}|${row.spawnAt || ''}|${row.reward || ''}|${row.fullAddress || ''}`;
    unique.set(key, row);
  }

  const rows = [...unique.values()].sort((a, b) =>
    new Date(b.lockedAt || b.spawnAt || 0) - new Date(a.lockedAt || a.spawnAt || 0)
  );

  console.log(`UPLAND_TREASURE_HISTORY_OK: cities=${cities.length} successful=${successfulCities} failed=${failedCities} uniqueRecords=${rows.length}`);
  return rows;
}

function findTextChannel(guild, candidates) {
  return guild.channels.cache.find(channel => {
    if (!channel.isTextBased?.()) return false;
    if (channel.type === ChannelType.GuildCategory) return false;
    return candidates.some(name => String(channel.name).toLowerCase() === String(name).toLowerCase());
  });
}

function upx(value) {
  return `${Number(value || 0).toLocaleString('en-US')} UPX`;
}

function treasureDate(row) {
  return new Date(row.lockedAt || row.spawnAt || 0);
}

function localDayKey(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bahia',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

async function registerCommands() {
  if (!CLIENT_ID || !DISCORD_TOKEN || !GUILD_ID) throw new Error('DISCORD_COMMAND_CONFIG_MISSING');
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const commands = [
    new SlashCommandBuilder().setName('node-status').setDescription('Show Node Hub bot status.'),
    new SlashCommandBuilder()
      .setName('treasure')
      .setDescription('Look up public Treasure Hunt history for an Upland player.')
      .addStringOption(option => option.setName('igname').setDescription('Upland IG Name, for example periclezdiaz.').setRequired(true)),
    new SlashCommandBuilder()
      .setName('player-stats')
      .setDescription('Show public Treasure Hunt statistics for an Upland player.')
      .addStringOption(option => option.setName('igname').setDescription('Upland IG Name.').setRequired(true)),
  ].map(command => command.toJSON());

  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  console.log(`UPLAND_COMMANDS_REGISTERED:guild=${GUILD_ID}`);
}

function treasureEmbed(rows, ign) {
  const total = rows.reduce((sum, row) => sum + Number(row.reward || 0), 0);
  const recent = rows.slice(0, 10);
  return new EmbedBuilder()
    .setTitle('TREASURE HUNT RESULT')
    .setDescription([
      `**Player:** ${recent[0]?.userName || ign}`,
      `**Public rewards found:** ${upx(total)}`,
      `**Treasures found:** ${rows.length}`,
      '',
      '**Recent history**',
      ...recent.map((row, index) => `${index + 1}. ${upx(row.reward)} | ${row.treasureType || 'treasure'} | ${row.fullAddress || 'Unknown location'} | ${row.lockedAt ? new Date(row.lockedAt).toISOString() : 'Unknown date'}`),
    ].join('\n'))
    .setFooter({ text: 'Node Hub · Upland public API' })
    .setTimestamp();
}

function statsEmbed(rows, ign) {
  const total = rows.reduce((sum, row) => sum + Number(row.reward || 0), 0);
  const best = rows.reduce((max, row) => Math.max(max, Number(row.reward || 0)), 0);
  return new EmbedBuilder()
    .setTitle('PLAYER STATS')
    .setDescription([
      `**Player:** ${rows[0]?.userName || ign}`,
      `**Public treasures:** ${rows.length}`,
      `**Public rewards:** ${upx(total)}`,
      `**Average reward:** ${upx(total / rows.length)}`,
      `**Best reward:** ${upx(best)}`,
      '',
      'Data source: Upland public Treasure Hunt history.',
    ].join('\n'))
    .setFooter({ text: 'Node Hub · Upland public API' })
    .setTimestamp();
}

async function publishDailyRanking(guild, rows) {
  const channel = findTextChannel(guild, RANKING_CHANNELS);
  if (!channel) return;
  const today = localDayKey();
  const todayRows = rows.filter(row => localDayKey(treasureDate(row)) === today);
  if (!todayRows.length) return;

  const totals = new Map();
  for (const row of todayRows) {
    const key = normalizeIgn(row.userName);
    const item = totals.get(key) || { username: row.userName || 'Unknown', reward: 0, treasures: 0 };
    item.reward += Number(row.reward || 0);
    item.treasures += 1;
    totals.set(key, item);
  }

  const ranking = [...totals.values()].sort((a, b) => b.reward - a.reward).slice(0, 10);
  const marker = `NODEHUB_DAILY_RANKING:${today}`;
  const recent = await channel.messages.fetch({ limit: 100 }).catch(() => null);
  if (recent?.some(message => message.author?.bot && message.embeds?.some(embed => String(embed.footer?.text || '').includes(marker)))) return;

  await channel.send({
    embeds: [new EmbedBuilder()
      .setTitle(`DAILY TREASURE RANKING · ${today}`)
      .setDescription(ranking.map((item, index) => `**${index + 1}. ${item.username}** | ${upx(item.reward)} | ${item.treasures} treasure${item.treasures === 1 ? '' : 's'}`).join('\n'))
      .setFooter({ text: marker })
      .setTimestamp()],
  });
}

async function sync(client) {
  const rows = await fetchTreasureHistory();
  for (const guild of client.guilds.cache.values()) {
    await publishDailyRanking(guild, rows).catch(error => console.error(`UPLAND_RANKING_ERROR:${guild.id}:${error.message}`));
  }
  return rows;
}

function setupUplandData(client) {
  client.once('ready', async () => {
    try {
      console.log(`UPLAND_CONFIG_V2: appIdPresent=${Boolean(APP_ID)} accessTokenPresent=${Boolean(APP_ACCESS_TOKEN)} endpoint=${API_BASE}`);
      await registerCommands();
      const rows = await sync(client);
      console.log(`UPLAND_READY_V2: treasureRecords=${rows.length}`);
      setInterval(() => sync(client).catch(error => console.error(`UPLAND_SYNC_ERROR:${error.message}`)), 5 * 60 * 1000);
    } catch (error) {
      console.error(`UPLAND_API_BOOTSTRAP_FAILED:${error.message}`);
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'node-status') {
      await interaction.reply({ content: `Node Hub Status\nDiscord: Online\nUpland API: ${APP_ID && APP_ACCESS_TOKEN ? 'Configured' : 'Not configured'}\nLatency: ${client.ws.ping}ms` });
      return;
    }

    if (interaction.commandName === 'treasure' || interaction.commandName === 'player-stats') {
      const ign = normalizeIgn(interaction.options.getString('igname', true));
      await interaction.deferReply();
      try {
        const rows = (await fetchTreasureHistory()).filter(row => normalizeIgn(row.userName) === ign);
        if (!rows.length) return interaction.editReply(`No public Treasure Hunt history found for **${ign}**.`);
        await interaction.editReply({ embeds: [interaction.commandName === 'treasure' ? treasureEmbed(rows, ign) : statsEmbed(rows, ign)] });
      } catch (error) {
        console.error(`UPLAND_${interaction.commandName.toUpperCase()}_ERROR:${error.message}`);
        await interaction.editReply(`Unable to retrieve Upland data: ${error.message}`);
      }
    }
  });
}

module.exports = { setupUplandData, fetchTreasureHistory };
