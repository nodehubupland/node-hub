const { SlashCommandBuilder, REST, Routes, EmbedBuilder } = require('discord.js');

const CLIENT_ID = String(process.env.DISCORD_CLIENT_ID || '').trim();
const DISCORD_TOKEN = String(process.env.DISCORD_TOKEN || '').trim();
const GUILD_ID = String(process.env.DISCORD_GUILD_ID || '').trim();
const DAILY_RANKING_CHANNEL_ID = String(process.env.DAILY_RANKING_CHANNEL_ID || '').trim();
const TREASURE_FUNCTION = String(process.env.UPLAND_TREASURE_FUNCTION_URL || 'https://ynqtzyzxspoxssjrjeve.supabase.co/functions/v1/upland-treasure').trim();
const ANALYTICS_FUNCTION = String(process.env.UPLAND_TREASURE_ANALYTICS_URL || 'https://ynqtzyzxspoxssjrjeve.supabase.co/functions/v1/upland-treasure-analytics').trim();
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
  } finally { clearTimeout(timer); }
}

async function fetchAnalytics(period = '24h') {
  const url = new URL(ANALYTICS_FUNCTION);
  url.searchParams.set('period', period);
  const headers = { Accept: 'application/json' };
  if (TREASURE_KEY) headers['x-node-hub-key'] = TREASURE_KEY;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 60000);
  try {
    const response = await fetch(url, { headers, signal: controller.signal });
    const text = await response.text();
    let body = {};
    try { body = text ? JSON.parse(text) : {}; } catch { body = { success: false, error: 'INVALID_ANALYTICS_RESPONSE' }; }
    if (!response.ok || body.success === false) throw new Error(body.error || body.message || `HTTP_${response.status}`);
    return body;
  } catch (error) {
    if (error.name === 'AbortError') throw new Error('UPLAND_TREASURE_ANALYTICS_TIMEOUT');
    throw error;
  } finally { clearTimeout(timer); }
}

function embed(rows, ign) {
  const total = rows.reduce((sum, row) => sum + Number(row.reward || 0), 0);
  const lines = rows.slice(0, 10).map((row, index) => `**${index + 1}.** ${Number(row.reward || 0).toLocaleString('en-US')} UPX • ${row.treasureType || 'treasure'}\n${row.fullAddress || 'Address unavailable'}\n${row.lockedAt || row.spawnAt || 'Date unavailable'}`);
  return new EmbedBuilder().setTitle('TREASURE HUNT RESULT').setDescription(`**Player:** ${rows[0]?.userName || ign}\n**Treasures found:** ${rows.length}\n**Total rewards:** ${total.toLocaleString('en-US')} UPX\n\n**Recent history**\n${lines.join('\n\n')}`.slice(0, 4096)).setFooter({ text: 'Node Hub · Upland Developers API' }).setTimestamp();
}

function analyticsEmbed(body) {
  const t = body.totals || {};
  const period = body.period || '24h';
  const costLine = t.costsAvailable ? `**Costs:** ${Number(t.costs || 0).toLocaleString('en-US')} UPX\n**Net profit:** ${Number(t.netProfit || 0).toLocaleString('en-US')} UPX` : '**Costs:** not available from the current indexed response';
  const topCities = (body.cities || []).slice(0, 10).map((c, i) => `**${i + 1}.** ${c.city} · ${c.chests} chests · ${Number(c.totalUpx || 0).toLocaleString('en-US')} UPX`).join('\n');
  const breakdown = (body.chestBreakdown || []).slice(0, 10).map((x) => `${x.reward}: ${x.count}`).join(' · ');
  return new EmbedBuilder().setTitle(`TREASURE HUNT ANALYTICS · ${period.toUpperCase()}`).setDescription(`**UPX found:** ${Number(t.totalUpx || 0).toLocaleString('en-US')}\n**Sparklet found:** ${Number(t.sparkletFound || 0).toLocaleString('en-US')}\n**Chests:** ${Number(t.totalChests || 0).toLocaleString('en-US')}\n**Active hunters:** ${Number(t.activeHunters || 0).toLocaleString('en-US')}\n**Active cities:** ${Number(t.activeCities || 0).toLocaleString('en-US')}\n\n${costLine}\n\n**Chest breakdown**\n${breakdown || 'No UPX chest breakdown available'}\n\n**Top cities by chests**\n${topCities || 'No city data available'}`.slice(0, 4096)).setFooter({ text: 'Node Hub · Upland Developers API' }).setTimestamp();
}

function dailyRankingEmbed(body) {
  const date = new Date().toISOString().slice(0, 10);
  const ranking = Array.isArray(body.playerRanking) ? body.playerRanking.slice(0, 30) : [];
  const lines = ranking.map((player, index) => {
    const treasureWord = Number(player.treasures) === 1 ? 'treasure' : 'treasures';
    return `${index + 1}. **${player.userName}**\n— ${Number(player.totalUpx || 0).toLocaleString('en-US')} UPX · ${Number(player.treasures || 0)} ${treasureWord}`;
  });
  const description = lines.length ? lines.join('\n\n') : 'No Treasure Hunt results available for the last 24 hours.';
  return new EmbedBuilder()
    .setTitle(`DAILY TREASURE RANKING · ${date}`)
    .setDescription(description.slice(0, 4096))
    .setFooter({ text: `NODEHUB_DAILY_RANKING:${date}` })
    .setTimestamp();
}

async function updateDailyRanking(client) {
  if (!DAILY_RANKING_CHANNEL_ID) {
    console.warn('DAILY_RANKING_CHANNEL_ID is not configured; hourly ranking is disabled.');
    return;
  }
  try {
    const channel = await client.channels.fetch(DAILY_RANKING_CHANNEL_ID);
    if (!channel || !channel.isTextBased()) throw new Error('DAILY_RANKING_CHANNEL_NOT_FOUND_OR_NOT_TEXT');
    const body = await fetchAnalytics('24h');
    const messageId = String(process.env.DAILY_RANKING_MESSAGE_ID || '').trim();
    const message = messageId ? await channel.messages.fetch(messageId).catch(() => null) : null;
    const embed = dailyRankingEmbed(body);
    if (message) {
      await message.edit({ content: '', embeds: [embed] });
      console.log('DAILY_RANKING_UPDATED', message.id);
    } else {
      const sent = await channel.send({ embeds: [embed] });
      console.log('DAILY_RANKING_CREATED', sent.id);
      console.log(`Set DAILY_RANKING_MESSAGE_ID=${sent.id} to keep editing this same message.`);
    }
  } catch (error) {
    console.error('DAILY_RANKING_UPDATE_ERROR:', error.message);
  }
}

async function startDailyRanking(client) {
  if (!DAILY_RANKING_CHANNEL_ID) return;
  const run = () => updateDailyRanking(client);
  await run();
  setInterval(run, 60 * 60 * 1000);
}

async function register() {
  if (!CLIENT_ID || !DISCORD_TOKEN || !GUILD_ID) return;
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), {
    body: [
      new SlashCommandBuilder().setName('treasure').setDescription('Show Upland Treasure Hunt history for a player').addStringOption((option) => option.setName('ign').setDescription('Upland IGN').setRequired(true)).addStringOption((option) => option.setName('city').setDescription('Optional city name').setRequired(false)).toJSON(),
      new SlashCommandBuilder().setName('treasure-global').setDescription('Show global Upland Treasure Hunt analytics').addStringOption((option) => option.setName('period').setDescription('Analytics period').setRequired(false).addChoices({ name: '24 hours', value: '24h' }, { name: '48 hours', value: '48h' }, { name: '7 days', value: '7d' })).toJSON(),
    ],
  });
}

async function setupUplandData(client) {
  await register().catch((error) => console.error('UPLAND_COMMAND_REGISTER_ERROR:', error));
  client.once('ready', () => startDailyRanking(client).catch((error) => console.error('DAILY_RANKING_START_ERROR:', error)));
  client.on('interactionCreate', async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'treasure') {
      const ign = normalizeIgn(interaction.options.getString('ign', true));
      const city = String(interaction.options.getString('city', false) || '').trim();
      await interaction.deferReply();
      try {
        const body = await fetchTreasure(ign, city);
        const rows = Array.isArray(body.results) ? body.results : [];
        if (!rows.length) return interaction.editReply({ content: `**${body.message || `No current Treasure Hunt record was found for ${ign}.`}**` });
        await interaction.editReply({ embeds: [embed(rows, ign)] });
      } catch (error) {
        console.error(`TREASURE_COMMAND_ERROR:${ign}:`, error.message);
        await interaction.editReply({ content: `Unable to retrieve Upland Treasure Hunt data: **${error.message}**` });
      }
      return;
    }
    if (interaction.commandName === 'treasure-global') {
      const period = interaction.options.getString('period', false) || '24h';
      await interaction.deferReply();
      try {
        const body = await fetchAnalytics(period);
        await interaction.editReply({ embeds: [analyticsEmbed(body)] });
      } catch (error) {
        console.error(`TREASURE_GLOBAL_COMMAND_ERROR:${period}:`, error.message);
        await interaction.editReply({ content: `Unable to retrieve global Treasure Hunt analytics: **${error.message}**` });
      }
    }
  });
}

module.exports = { setupUplandData };