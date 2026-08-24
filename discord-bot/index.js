require('dotenv').config();

const express = require('express');
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  SlashCommandBuilder,
  REST,
  Routes,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  console.error('Missing DISCORD_TOKEN or DISCORD_CLIENT_ID in .env');
  process.exit(1);
}

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const ROLE_DEFINITIONS = [
  { name: 'Founder', color: 0xF5A623 },
  { name: 'Administrator', color: 0xE74C3C },
  { name: 'Lead Developer', color: 0x9B59B6 },
  { name: 'Developer', color: 0x3498DB },
  { name: 'Moderator', color: 0x2ECC71 },
  { name: 'Partner', color: 0x1ABC9C },
  { name: 'Verified', color: 0xF1C40F },
  { name: 'Uplander', color: 0x95A5A6 },
  { name: 'Member', color: 0x7F8C8D },
  { name: 'Bot', color: 0x5865F2 },
];

const PUBLIC_STRUCTURE = [
  { name: '📌 START HERE', channels: [['welcome', 'text'], ['rules', 'text'], ['announcements', 'text']] },
  { name: '🌐 COMMUNITY', channels: [['general', 'text'], ['upland', 'text'], ['suggestions', 'text']] },
  { name: '🤖 NODE HUB', channels: [['getting-started', 'text'], ['support', 'text']] },
  { name: '🌎 UPLAND', channels: [['upland-alerts', 'text'], ['upland-data', 'text']] },
  { name: '💰 SUPPORT NODE HUB', channels: [['donate', 'text']] },
];

const TEAM_STRUCTURE = [
  ['team-chat', 'text'],
  ['tasks', 'text'],
  ['development', 'text'],
  ['internal-bugs', 'text'],
  ['node-status', 'text'],
  ['event-log', 'text'],
];

const TEAM_ROLES = new Set(['Founder', 'Administrator', 'Lead Developer', 'Developer', 'Moderator']);

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function getOrCreateRole(guild, definition) {
  let role = guild.roles.cache.find(r => r.name === definition.name);
  if (!role) {
    role = await guild.roles.create({ name: definition.name, color: definition.color, reason: 'Node Hub initial Discord setup' });
  }
  return role;
}

async function getOrCreateCategory(guild, name, privateCategory = false, teamRoleIds = []) {
  let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === name);
  if (!category) category = await guild.channels.create({ name, type: ChannelType.GuildCategory });
  if (privateCategory) {
    await category.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
    for (const roleId of teamRoleIds) await category.permissionOverwrites.edit(roleId, { ViewChannel: true });
  }
  return category;
}

async function getOrCreateTextChannel(guild, name, parent, privateChannel = false, teamRoleIds = []) {
  const channelName = slug(name);
  let channel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === channelName);
  if (!channel) {
    channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildText, parent: parent.id, reason: 'Node Hub initial Discord setup' });
  } else if (channel.parentId !== parent.id) {
    await channel.setParent(parent.id, { lockPermissions: false });
  }
  if (privateChannel) {
    await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
    for (const roleId of teamRoleIds) {
      await channel.permissionOverwrites.edit(roleId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
    }
  }
  return channel;
}

async function setupServer(guild) {
  const roles = {};
  for (const definition of ROLE_DEFINITIONS) roles[definition.name] = await getOrCreateRole(guild, definition);
  const teamRoleIds = ROLE_DEFINITIONS.filter(r => TEAM_ROLES.has(r.name)).map(r => roles[r.name].id);
  for (const section of PUBLIC_STRUCTURE) {
    const category = await getOrCreateCategory(guild, section.name);
    for (const [name] of section.channels) await getOrCreateTextChannel(guild, name, category);
  }
  const teamCategory = await getOrCreateCategory(guild, '🟧 TEAM', true, teamRoleIds);
  for (const [name] of TEAM_STRUCTURE) await getOrCreateTextChannel(guild, name, teamCategory, true, teamRoleIds);
  const logChannel = guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === 'event-log');
  if (logChannel) await logChannel.send({ content: 'Node Hub event logging is ready. System events will appear here automatically.' });
  return { roles, teamCategory };
}

const commands = [
  new SlashCommandBuilder().setName('setup-server').setDescription('Create the initial Node Hub Discord structure.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator.toString()),
  new SlashCommandBuilder().setName('node-status').setDescription('Show the current Node Hub bot status.'),
].map(command => command.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  if (GUILD_ID) {
    await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
    console.log(`Registered commands in guild ${GUILD_ID}`);
  } else {
    await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
    console.log('Registered global commands');
  }
}

client.once('ready', async () => {
  console.log(`Node Hub Discord Bot online as ${client.user.tag}`);
  await registerCommands();
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (interaction.commandName === 'setup-server') {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Administrator permission is required.', ephemeral: true });
    await interaction.deferReply({ ephemeral: true });
    try {
      await setupServer(interaction.guild);
      await interaction.editReply('Node Hub server structure created successfully.');
    } catch (error) {
      console.error(error);
      await interaction.editReply(`Setup failed: ${error.message}`);
    }
  }
  if (interaction.commandName === 'node-status') {
    await interaction.reply({ content: `**Node Hub Status**\nDiscord: Online\nBot: ${client.user.tag}\nLatency: ${client.ws.ping}ms`, ephemeral: false });
  }
});

// Upland Developer API webhook endpoint.
// GitHub Pages cannot receive POST requests, so the webhook is served by the Render service running this process.
const server = express();
server.use(express.json({ limit: '1mb' }));

server.get('/', (_req, res) => res.status(200).json({ service: 'Node Hub webhook', status: 'online' }));
server.get('/health', (_req, res) => res.status(200).json({ status: 'ok' }));

server.post('/webhook', (req, res) => {
  const payload = req.body || {};
  console.log('Upland webhook received:', JSON.stringify(payload));

  // Upland sends a validation POST before enabling the webhook.
  // A successful HTTP 200 response confirms that the endpoint accepts POST requests.
  return res.status(200).json({ status: 'ok' });
});

server.use((_req, res) => res.status(404).json({ status: 404, message: 'Not Found' }));

const PORT = Number(process.env.PORT || 10000);
server.listen(PORT, '0.0.0.0', () => {
  console.log(`Node Hub webhook server listening on port ${PORT}`);
});

client.login(TOKEN);
