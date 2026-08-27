const { SlashCommandBuilder, REST, Routes, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');

const APP_ID = String(process.env.UPLAND_APP_ID || '').trim();
const APP_ACCESS_TOKEN = String(process.env.UPLAND_APP_ACCESS_TOKEN || '').trim();
const CLIENT_ID = String(process.env.DISCORD_CLIENT_ID || '').trim();
const DISCORD_TOKEN = String(process.env.DISCORD_TOKEN || '').trim();
const GUILD_ID = String(process.env.DISCORD_GUILD_ID || '').trim();
const TREASURE_SERVICE = String(process.env.SUPABASE_URL || 'https://ynqtzyzxspoxssjrjeve.supabase.co').trim() + '/functions/v1/upland-treasure';
const NODE_HUB_URL = 'https://nodehubupland.github.io/node-hub/#dashboard';

function normalizeIgn(value) {
  return String(value || '').trim().replace(/^@/, '').replace(/\s+/g, '').toLowerCase();
}

async function fetchTreasureForPlayer(ign) {
  const normalized = normalizeIgn(ign);
  const url = new URL(TREASURE_SERVICE);
  url.searchParams.set('ign', normalized);
  const headers = { Accept: 'application/json' };
  if (APP_ACCESS_TOKEN) headers['x-node-hub-key'] = APP_ACCESS_TOKEN;
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(20000) });
  const text = await response.text();
  let body = null;
  try { body = text ? JSON.parse(text) : null; } catch {}
  if (!response.ok) throw new Error(body?.error || `UPLAND_TREASURE_HTTP_${response.status}`);
  if (body?.error) throw new Error(body.error);
  return Array.isArray(body?.results) ? body.results : [];
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
    .setDescription([
      `**Player:** ${sorted[0]?.userName || ign}`,
      `**Treasures found:** ${sorted.length}`,
      `**Total rewards:** ${reward(total)}`,
      '',
      '**History**',
      ...lines,
    ].join('\n'))
    .setFooter({ text: 'Node Hub · Upland' })
    .setTimestamp();
}

function connectPrompt(ign) {
  return {
    content: `**${ign}** is not connected to Node Hub yet. Connect the Upland account on Node Hub, authorize the application, then run **/treasure ${ign}** again.`,
    components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setLabel('Connect Upland Account').setStyle(ButtonStyle.Link).setURL(NODE_HUB_URL))],
  };
}

async function registerCommands() {
  if (!CLIENT_ID || !DISCORD_TOKEN || !GUILD_ID) return;
  const rest = new REST({ version: '10' }).setToken(DISCORD_TOKEN);
  const commands = [
    new SlashCommandBuilder().setName('node-status').setDescription('Show Node Hub bot status.'),
    new SlashCommandBuilder().setName('treasure').setDescription('Show an Upland player Treasure Hunt history.').addStringOption(o => o.setName('igname').setDescription('Upland IG Name.').setRequired(true)),
    new SlashCommandBuilder().setName('player-stats').setDescription('Show Upland Treasure Hunt statistics.').addStringOption(o => o.setName('igname').setDescription('Upland IG Name.').setRequired(true)),
  ].map(c => c.toJSON());
  await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
}

function setupUplandData(client) {
  client.once('ready', async () => {
    console.log(`UPLAND_V5_READY: appId=${Boolean(APP_ID)} accessToken=${Boolean(APP_ACCESS_TOKEN)} treasureService=${TREASURE_SERVICE}`);
    try { await registerCommands(); } catch (error) { console.error(`UPLAND_COMMAND_REGISTER_ERROR:${error.message}`); }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'node-status') {
      await interaction.reply({ content: `Node Hub Status\nDiscord: Online\nUpland API: ${APP_ID && APP_ACCESS_TOKEN ? 'Configured' : 'Not configured'}\nTreasure service: Active\nLatency: ${client.ws.ping}ms` });
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
      await interaction.editReply({
        embeds: [new EmbedBuilder().setTitle('PLAYER STATS').setDescription([
          `**Player:** ${rows[0].userName || ign}`,
          `**Treasures found:** ${rows.length}`,
          `**Total rewards:** ${reward(total)}`,
          `**Average reward:** ${reward(total / rows.length)}`,
          `**Best reward:** ${reward(best)}`,
        ].join('\n')).setTimestamp()],
      });
    } catch (error) {
      console.error(`UPLAND_${interaction.commandName.toUpperCase()}_ERROR:${error.message}`);
      if (error.message === 'PLAYER_NOT_CONNECTED') await interaction.editReply(connectPrompt(ign));
      else await interaction.editReply(`Unable to retrieve Upland data: ${error.message}`);
    }
  });
}

module.exports = { setupUplandData, fetchTreasureForPlayer };
