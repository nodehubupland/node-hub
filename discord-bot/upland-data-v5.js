const { SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');

const CLIENT_ID = String(process.env.DISCORD_CLIENT_ID || '').trim();
const DISCORD_TOKEN = String(process.env.DISCORD_TOKEN || '').trim();
const GUILD_ID = String(process.env.DISCORD_GUILD_ID || '').trim();
const TREASURE_FUNCTION = String(
  process.env.UPLAND_TREASURE_FUNCTION_URL ||
  'https://ynqtzyzxspoxssjrjeve.supabase.co/functions/v1/upland-treasure',
).trim();
const TREASURE_KEY = String(process.env.UPLAND_TREASURE_KEY || '').trim();

function normalizeIgn(value) {
  return String(value || '').trim().replace(/^@/, '').replace(/\s+/g, '').toLowerCase();
}

async function fetchTreasure(ign, city = '') {
  const url = new URL(TREASURE_FUNCTION);
  url.searchParams.set('ign', ign);
  if (city) url.searchParams.set('city', city);

  const headers = { Accept: 'application/json' };
  if (TREASURE_KEY) headers['x-node-hub-key'] = TREASURE_KEY;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20000);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    const text = await response.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { success: false, error: 'INVALID_FUNCTION_RESPONSE' }; }

    if (!response.ok || body.success === false) {
      const error = body.error || body.message || `HTTP_${response.status}`;
      const diagnostic = body.diagnostic ? `:${JSON.stringify(body.diagnostic).slice(0, 1200)}` : '';
      throw new Error(`${error}${diagnostic}`);
    }

    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('UPLAND_TREASURE_TIMEOUT');
    throw error;
  } finally {
    clearTimeout(timer);
  }
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
    .setFooter({ text: 'Node Hub · Upland Developers API' })
    .setTimestamp();
}

async function register() {
  if (!CLIENT_ID || !DISCORD_TOKEN || !GUILD_ID) return;
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: [
      new SlashCommandBuilder()
        .setName('treasure')
        .setDescription('Show Upland Treasure Hunt history for a player')
        .addStringOption((option) =>
          option.setName('ign').setDescription('Upland IGN').setRequired(true),
        )
        .addStringOption((option) =>
          option.setName('city').setDescription('Optional city name').setRequired(false),
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
    const city = String(interaction.options.getString('city', false) || '').trim();
    await interaction.deferReply();

    try {
      const body = await fetchTreasure(ign, city);
      const rows = Array.isArray(body.results) ? body.results : [];

      if (!rows.length) {
        const message = body.message || `No current Treasure Hunt record was found for ${ign}.`;
        return interaction.editReply({ content: `**${message}**` });
      }

      await interaction.editReply({ embeds: [embed(rows, ign)] });
    } catch (error) {
      console.error(`TREASURE_COMMAND_ERROR:${ign}:`, error.message);
      await interaction.editReply({
        content: `Unable to retrieve Upland Treasure Hunt data: **${error.message}**`,
      });
    }
  });
}

module.exports = { setupUplandData };