const { SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');

const APP_ID = String(process.env.UPLAND_APP_ID || '').trim();
const APPLICATION_ACCESS_TOKEN = String(process.env.UPLAND_APP_ACCESS_TOKEN || '').trim();
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
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(url, {
      headers: { Authorization: basicAuth(), Accept: 'application/json' },
      signal: controller.signal,
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`UPLAND_API_${response.status}:${text.slice(0, 300)}`);
    return text ? JSON.parse(text) : {};
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('UPLAND_API_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function unwrap(body) {
  if (Array.isArray(body?.results?.results)) return body.results.results;
  if (Array.isArray(body?.results)) return body.results;
  if (Array.isArray(body)) return body;
  return [];
}

function meta(body, page, size) {
  const source = body?.results && !Array.isArray(body.results) ? body.results : body;
  return {
    totalResults: Number(source?.totalResults || body?.totalResults || 0),
    currentPage: Number(source?.currentPage || body?.currentPage || page),
    pageSize: Number(source?.pageSize || body?.pageSize || size),
  };
}

async function fetchTreasureHistory(cityId = '') {
  const all = [];
  let page = 1;
  // Upland's documented examples use small page sizes. The previous value of 100
  // caused the production endpoint to return HTTP 500 with "Cannot convert undefined or null to object".
  const pageSize = 10;

  while (page <= 100) {
    const params = { currentPage: page, pageSize };
    if (cityId) params.cityId = cityId;

    const body = await uplandGet('/treasures-history', params);
    const rows = unwrap(body);
    const information = meta(body, page, pageSize);
    all.push(...rows);

    if (!rows.length) break;
    if (rows.length < pageSize) break;
    if (information.totalResults > 0 && page >= Math.ceil(information.totalResults / Math.max(information.pageSize, 1))) break;
    page += 1;
  }

  const unique = new Map();
  for (const row of all) {
    unique.set(
      `${row.userName || ''}|${row.lockedAt || ''}|${row.spawnAt || ''}|${row.reward || ''}|${row.fullAddress || ''}`,
      row,
    );
  }

  return [...unique.values()].sort(
    (a, b) => new Date(b.lockedAt || b.spawnAt || 0) - new Date(a.lockedAt || a.spawnAt || 0),
  );
}

function embed(rows, ign) {
  const total = rows.reduce((sum, row) => sum + Number(row.reward || 0), 0);
  const lines = rows.slice(0, 10).map(
    (row, index) =>
      `**${index + 1}.** ${Number(row.reward || 0).toLocaleString('en-US')} UPX • ${row.treasureType || 'treasure'}\n${row.fullAddress || 'Address unavailable'}\n${row.lockedAt || row.spawnAt || 'Date unavailable'}`,
  );

  return new EmbedBuilder()
    .setTitle('TREASURE HUNT RESULT')
    .setDescription(
      `**Player:** ${rows[0]?.userName || ign}\n**Treasures found:** ${rows.length}\n**Total rewards:** ${total.toLocaleString('en-US')} UPX\n\n**Recent history**\n${lines.join('\n\n')}`.slice(0, 4096),
    )
    .setFooter({ text: 'Node Hub · Upland public Developers API' })
    .setTimestamp();
}

async function register() {
  if (!CLIENT_ID || !DISCORD_TOKEN || !GUILD_ID) return;
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: [
      new SlashCommandBuilder()
        .setName('treasure')
        .setDescription('Show public Upland Treasure Hunt history for a player')
        .addStringOption((option) =>
          option.setName('ign').setDescription('Upland IGN').setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('cityid').setDescription('Optional Upland city ID').setRequired(false),
        )
        .toJSON(),
    ],
  });
}

async function setupUplandData(client) {
  await register().catch((error) => console.error('UPLAND_COMMAND_REGISTER_ERROR:', error));

  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'treasure') return;

    const ign = normalizeIgn(interaction.options.getString('ign', true));
    const cityId = interaction.options.getString('cityid', false) || '';
    await interaction.deferReply();

    try {
      const rows = (await fetchTreasureHistory(cityId)).filter(
        (row) => normalizeIgn(row.userName) === ign,
      );

      if (!rows.length) {
        return interaction.editReply({
          content: `No public Treasure Hunt history found for **${ign}**. The Upland API returned no matching record in the queried history.`,
        });
      }

      await interaction.editReply({ embeds: [embed(rows, ign)] });
    } catch (error) {
      console.error(`TREASURE_COMMAND_ERROR:${ign}:`, error);
      await interaction.editReply({
        content: `Unable to retrieve Upland Treasure Hunt data: **${error.message}**`,
      });
    }
  });
}

module.exports = { setupUplandData, fetchTreasureHistory };