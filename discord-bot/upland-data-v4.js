const { SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const APP_ID = String(process.env.UPLAND_APP_ID || '').trim();
const APP_ACCESS_TOKEN = String(process.env.UPLAND_APP_ACCESS_TOKEN || '').trim();
const CLIENT_ID = String(process.env.DISCORD_CLIENT_ID || '').trim();
const DISCORD_TOKEN = String(process.env.DISCORD_TOKEN || '').trim();
const GUILD_ID = String(process.env.DISCORD_GUILD_ID || '').trim();
const TREASURE_URL = String(process.env.UPLAND_TREASURE_FUNCTION_URL || 'https://ynqtzyzxspoxssjrjeve.supabase.co/functions/v1/upland-treasure').trim();
const NODE_HUB_KEY = String(process.env.UPLAND_TREASURE_KEY || APP_ACCESS_TOKEN).trim();

function buildCommands() {
  return [new SlashCommandBuilder().setName('treasure').setDescription('Show public Upland Treasure Hunt history for a player').addStringOption(o => o.setName('ign').setDescription('Upland IGN').setRequired(true)).toJSON()];
}
async function register() {
  if (!CLIENT_ID || !DISCORD_TOKEN) return;
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: buildCommands() });
}
function connectionButton() {
  return new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Connect Upland Account').setStyle(ButtonStyle.Link).setURL('https://nodehubupland.github.io/node-hub/#dashboard'));
}
async function fetchTreasure(ign) {
  const url = new URL(TREASURE_URL);
  url.searchParams.set('ign', ign);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 55000);
  try {
    const response = await fetch(url, { method: 'GET', headers: { Accept: 'application/json', 'x-node-hub-key': NODE_HUB_KEY }, signal: controller.signal });
    const text = await response.text();
    let body = null;
    try { body = text ? JSON.parse(text) : null; } catch {}
    if (!response.ok) {
      const error = new Error(body?.error || `UPLAND_TREASURE_HTTP_${response.status}`);
      error.status = response.status;
      throw error;
    }
    return body || {};
  } catch (error) {
    if (error?.name === 'AbortError') {
      const timeout = new Error('TREASURE_TIMEOUT');
      timeout.code = 'TREASURE_TIMEOUT';
      throw timeout;
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
function historyEmbed(ign, data) {
  const rows = Array.isArray(data.results) ? data.results : [];
  const embed = new EmbedBuilder().setTitle(`Treasure Hunt • ${ign}`).setDescription(`Found **${rows.length}** public Treasure Hunt record${rows.length === 1 ? '' : 's'}.`);
  if (!rows.length) {
    embed.addFields({ name: 'Result', value: data.partial ? `No record found in the first ${data.search_limit?.toLocaleString?.() || data.search_limit || 10000} public Treasure records returned by the Upland API.` : 'No public Treasure Hunt history found for this player.' });
    if (data.partial) embed.setFooter({ text: `Search reached the configured limit. Upland reported ${data.total_results || 'more'} total records.` });
    return embed;
  }
  const lines = rows.slice(0, 10).map((r, i) => {
    const date = r.lockedAt || r.spawnAt || 'Date unavailable';
    const address = r.fullAddress || 'Address unavailable';
    const reward = r.reward != null ? `${r.reward} UPX` : 'Reward unavailable';
    const type = r.treasureType || 'treasure';
    return `**${i + 1}.** ${date}\n${type} • ${reward}\n${address}`;
  });
  embed.addFields({ name: 'History', value: lines.join('\n\n').slice(0, 1024) });
  if (data.partial) embed.setFooter({ text: `Search reached the configured limit of ${data.search_limit || 10000} records.` });
  return embed;
}
function errorMessage(error, ign) {
  if (error?.status === 404 && error?.message === 'PLAYER_NOT_CONNECTED') return { content: `**${ign}** is not connected to Node Hub yet. Connect the Upland account on Node Hub, authorize the application, then run **/treasure ${ign}** again.`, components: [connectionButton()] };
  if (error?.code === 'TREASURE_TIMEOUT') return { content: `The Upland Treasure search timed out for **${ign}**. The account is connected, but Upland took too long to return the history. Try again shortly.` };
  return { content: `Unable to retrieve Upland data: ${error?.message || 'Unknown error'}` };
}
async function setupUplandData(client) {
  await register().catch(error => console.error('UPLAND_COMMAND_REGISTER_ERROR:', error));
  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand() || interaction.commandName !== 'treasure') return;
    const ign = interaction.options.getString('ign', true).trim().replace(/^@/, '');
    await interaction.deferReply();
    try {
      const data = await fetchTreasure(ign);
      if (data.connected === false || data.error === 'PLAYER_NOT_CONNECTED') return interaction.editReply(errorMessage(Object.assign(new Error('PLAYER_NOT_CONNECTED'), { status: 404 }), ign));
      return interaction.editReply({ embeds: [historyEmbed(ign, data)] });
    } catch (error) {
      console.error(`TREASURE_COMMAND_ERROR:${ign}:`, error);
      return interaction.editReply(errorMessage(error, ign));
    }
  });
}

module.exports = { setupUplandData };
