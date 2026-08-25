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
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const discordEnabled = Boolean(TOKEN && CLIENT_ID);

if (!discordEnabled) console.warn('Discord bot credentials are not configured. Starting webhook server only.');

const client = discordEnabled ? new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
}) : null;

const ROLE_DEFINITIONS = [
  { name: 'Founder', color: 0xF5A623 },
  { name: 'Administrator', color: 0xE74C3C },
  { name: 'Developer', color: 0x9B59B6 },
  { name: 'Moderator', color: 0x2ECC71 },
  { name: 'Partner', color: 0x1ABC9C },
  { name: 'Legend', color: 0xF1C40F },
  { name: 'Elite', color: 0xE67E22 },
  { name: 'Contrib', color: 0x3498DB },
  { name: 'Active', color: 0x2ECC71 },
  { name: 'Uplander', color: 0x95A5A6 },
  { name: 'Member', color: 0x7F8C8D },
  { name: 'Verified', color: 0xF1C40F },
  { name: 'Bot', color: 0x5865F2 },
  { name: 'Upland Listings', color: 0x3498DB },
  { name: 'Treasure Hunt', color: 0xF5A623 },
  { name: 'Upland News', color: 0xE67E22 },
  { name: 'Node Hub Content', color: 0x9B59B6 },
  { name: 'Community', color: 0x1ABC9C },
];

const PUBLIC_STRUCTURE = [
  { name: '📌 START HERE', channels: ['welcome', 'rules', 'announcements'] },
  { name: '🌐 COMMUNITY', channels: ['general', 'suggestions', 'community-promo', 'partnerships', 'events'] },
  { name: '🤖 NODE HUB', channels: ['getting-started', 'support', 'leaderboard', 'player-stats'] },
  { name: '🌎 UPLAND', channels: ['upland', 'treasure-hunt', 'upland-wins', 'upland-discussion'] },
  { name: '📊 UPLAND DATA', channels: ['bsts-assets', 'bsts-properties', 'new-listings', 'listing-alerts', 'treasure-results', 'upland-alerts'] },
  { name: '🔊 VOICE', channels: ['Upland', 'Launches', 'Node Hub', 'General'] },
  { name: '💰 SUPPORT NODE HUB', channels: ['donate'] },
];

const AUTOMATION_CHANNELS = new Set(['rules', 'announcements', 'listing-alerts', 'new-listings', 'treasure-results', 'upland-alerts', 'node-status', 'event-log']);
const TEAM_STRUCTURE = ['team-chat', 'tasks', 'development', 'internal-bugs', 'node-status', 'event-log'];
const TEAM_ROLES = new Set(['Founder', 'Administrator', 'Developer', 'Moderator']);
const NOTIFICATION_ROLES = new Set(['Upland Listings', 'Treasure Hunt', 'Upland News', 'Node Hub Content', 'Community']);
const PROTECTED_ROLES = new Set(['Founder', 'Administrator']);
const spamTracker = new Map();
const SPAM_LIMIT = 6;
const SPAM_WINDOW_MS = 8000;

const ROLE_PREFERENCES = {
  listings: { role: 'Upland Listings', emoji: '🏠', en: 'Upland Listings', pt: 'Listagens de Upland' },
  treasure: { role: 'Treasure Hunt', emoji: '🏆', en: 'Treasure Hunt', pt: 'Caça ao Tesouro' },
  news: { role: 'Upland News', emoji: '📰', en: 'Upland News', pt: 'Notícias do Upland' },
  content: { role: 'Node Hub Content', emoji: '📺', en: 'Node Hub Content', pt: 'Conteúdo do Node Hub' },
  community: { role: 'Community', emoji: '🌎', en: 'Community', pt: 'Comunidade' },
};

const RULES = `**NODE HUB COMMUNITY RULES**\n\n**1. Be respectful**\nTreat members with respect. Harassment, hate speech, threats and targeted abuse are not allowed.\n\n**2. No spam or flooding**\nDo not flood channels with repeated messages, mentions or unwanted content.\n\n**3. No scams or fraud**\nPhishing, impersonation, fake giveaways and attempts to steal accounts or assets are prohibited.\n\n**4. No malicious links or files**\nDo not post malware, suspicious files or phishing links.\n\n**5. Use the correct channel**\nKeep conversations in the appropriate channel.\n\n**6. Respect privacy**\nNever share another person's credentials, API keys, tokens or private information.\n\n**7. Upland content**\nUpland discussion is welcome. Follow Upland's rules and terms. Node Hub is an independent community project.\n\n**8. No impersonation**\nDo not impersonate Node Hub staff, Upland staff or other members.\n\n**9. Staff instructions**\nModerators may remove content, timeout, mute, move or ban members when necessary.\n\n**10. Common sense**\nDo not post content intended to harm, disrupt or compromise the community.\n\nSerious violations may result in immediate removal or ban.`;

function slug(name) { return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); }
function findChannel(guild, name) { return guild.channels.cache.find(c => (c.type === ChannelType.GuildText || c.type === ChannelType.GuildVoice) && c.name === slug(name)); }
function findLogChannel(guild) { return findChannel(guild, 'event-log'); }

async function logEvent(guild, title, description, color = 0x5865F2) {
  const channel = findLogChannel(guild);
  if (!channel || channel.type !== ChannelType.GuildText) return;
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
  try { await channel.send({ embeds: [embed] }); } catch (error) { console.error('Event log failed:', error.message); }
}

async function getOrCreateRole(guild, definition) {
  let role = guild.roles.cache.find(r => r.name === definition.name);
  if (!role) role = await guild.roles.create({ name: definition.name, color: definition.color, reason: 'Node Hub server setup' });
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
  if (!channel) channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildText, parent: parent.id, reason: 'Node Hub server setup' });
  else if (channel.parentId !== parent.id) await channel.setParent(parent.id, { lockPermissions: false });
  if (privateChannel) {
    await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
    for (const roleId of teamRoleIds) await channel.permissionOverwrites.edit(roleId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  }
  if (!privateChannel && AUTOMATION_CHANNELS.has(channelName)) {
    await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false });
  }
  return channel;
}

async function getOrCreateVoiceChannel(guild, name, parent) {
  const channelName = slug(name);
  let channel = guild.channels.cache.find(c => c.type === ChannelType.GuildVoice && c.name === channelName);
  if (!channel) channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildVoice, parent: parent.id, reason: 'Node Hub voice setup' });
  else if (channel.parentId !== parent.id) await channel.setParent(parent.id, { lockPermissions: false });
  return channel;
}

async function positionRoles(guild, roles) {
  const botRole = roles.Bot;
  if (!botRole) return;
  const ordered = ['Bot', 'Moderator', 'Developer', 'Partner', 'Legend', 'Elite', 'Contrib', 'Active', 'Uplander', 'Member', 'Verified'];
  let position = Math.max(roles.Founder?.position || 2, roles.Administrator?.position || 2) - 1;
  for (const name of ordered) {
    const role = roles[name];
    if (!role || role.managed) continue;
    if (position > 1) {
      await role.setPosition(position).catch(() => {});
      position -= 1;
    }
  }
  const me = guild.members.me;
  if (me && botRole.position < me.roles.highest.position && !me.roles.cache.has(botRole.id)) await me.roles.add(botRole).catch(() => {});
}

function canAutoModerate(member, guild) {
  if (!member || member.user.bot) return false;
  if (member.id === guild.ownerId) return false;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return false;
  if (member.roles.cache.some(role => PROTECTED_ROLES.has(role.name))) return false;
  const me = guild.members.me;
  return Boolean(me && me.permissions.has(PermissionFlagsBits.ModerateMembers) && member.moderatable);
}

function preferenceRows() {
  const buttons = Object.entries(ROLE_PREFERENCES).map(([key, pref]) => new ButtonBuilder().setCustomId(`pref:${key}`).setLabel(`${pref.emoji} ${pref.en} / ${pref.pt}`).setStyle(ButtonStyle.Secondary));
  return [new ActionRowBuilder().addComponents(buttons.slice(0, 3)), new ActionRowBuilder().addComponents(buttons.slice(3))];
}

async function postPreferencePanel(guild) {
  const channel = findChannel(guild, 'welcome');
  if (!channel || channel.type !== ChannelType.GuildText) return;
  const recent = await channel.messages.fetch({ limit: 50 });
  const existing = recent.find(message => message.author.id === client.user.id && message.embeds.some(embed => embed.title === 'Notification Preferences / Preferências de Notificação'));
  if (existing) return existing;
  const embed = new EmbedBuilder()
    .setTitle('Notification Preferences / Preferências de Notificação')
    .setDescription('**English:** Choose what you want Node Hub to notify you about. Click again to remove a preference.\n\n**Português:** Escolha sobre o que você quer receber notificações. Clique novamente para remover uma preferência.\n\nYour basic Member role is assigned automatically.')
    .setColor(0x5865F2)
    .setFooter({ text: 'Node Hub • You can change your preferences anytime' });
  return channel.send({ embeds: [embed], components: preferenceRows() });
}

async function postRules(guild) {
  const channel = findChannel(guild, 'rules');
  if (!channel || channel.type !== ChannelType.GuildText) return;
  const recent = await channel.messages.fetch({ limit: 20 });
  const existing = recent.find(message => message.author.id === client.user.id && message.embeds.some(embed => embed.title === 'Node Hub Community Rules'));
  if (existing) return existing;
  return channel.send({ embeds: [new EmbedBuilder().setTitle('Node Hub Community Rules / Regras da Comunidade').setDescription(`${RULES}\n\n**Português**\n\nRespeite os membros, não faça spam, golpes, phishing, impersonação ou divulgação maliciosa. Use cada canal para seu objetivo, preserve a privacidade dos usuários e siga as orientações da equipe. Violações graves podem resultar em remoção ou banimento.`).setColor(0xF5A623).setTimestamp()] });
}

async function postWelcome(guild) {
  const channel = findChannel(guild, 'welcome');
  if (!channel || channel.type !== ChannelType.GuildText) return;
  const recent = await channel.messages.fetch({ limit: 50 });
  const existing = recent.find(message => message.author.id === client.user.id && message.embeds.some(embed => embed.title === 'Welcome to Node Hub / Bem-vindo ao Node Hub'));
  if (existing) return existing;
  const embed = new EmbedBuilder()
    .setTitle('Welcome to Node Hub / Bem-vindo ao Node Hub')
    .setDescription('**English**\nWelcome to Node Hub, a community focused on Upland, development, automation, data and technology.\n\nRead **#rules**, explore the community and choose your notification preferences below.\n\n**Português**\nBem-vindo ao Node Hub, uma comunidade focada em Upland, desenvolvimento, automação, dados e tecnologia.\n\nLeia **#rules**, conheça a comunidade e escolha abaixo quais notificações deseja receber.')
    .setColor(0x5865F2).setTimestamp();
  return channel.send({ embeds: [embed] });
}

async function setupServer(guild) {
  const roles = {};
  for (const definition of ROLE_DEFINITIONS) roles[definition.name] = await getOrCreateRole(guild, definition);
  const teamRoleIds = ROLE_DEFINITIONS.filter(r => TEAM_ROLES.has(r.name)).map(r => roles[r.name].id);
  for (const section of PUBLIC_STRUCTURE) {
    const category = await getOrCreateCategory(guild, section.name);
    for (const name of section.channels) {
      if (['Upland', 'Launches', 'Node Hub', 'General'].includes(name)) await getOrCreateVoiceChannel(guild, name, category);
      else await getOrCreateTextChannel(guild, name, category);
    }
  }
  const teamCategory = await getOrCreateCategory(guild, '🟧 TEAM', true, teamRoleIds);
  for (const name of TEAM_STRUCTURE) await getOrCreateTextChannel(guild, name, teamCategory, true, teamRoleIds);
  await postRules(guild);
  await postWelcome(guild);
  await postPreferencePanel(guild);
  await positionRoles(guild, roles);
  await logEvent(guild, 'Node Hub Setup', 'Server structure, moderation hierarchy and notification preferences are ready.', 0x2ECC71);
  return { roles, teamCategory };
}

const commands = [
  new SlashCommandBuilder().setName('setup-server').setDescription('Create or update the Node Hub Discord structure.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator.toString()),
  new SlashCommandBuilder().setName('post-rules').setDescription('Post the Node Hub community rules.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),
  new SlashCommandBuilder().setName('post-welcome').setDescription('Post the Node Hub welcome and preference panel.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),
  new SlashCommandBuilder().setName('node-status').setDescription('Show the current Node Hub bot status.'),
].map(command => command.toJSON());

async function registerCommands() {
  const rest = new REST({ version: '10' }).setToken(TOKEN);
  if (GUILD_ID) await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands });
  else await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands });
}

if (discordEnabled) {
  client.once('ready', async () => {
    console.log(`Node Hub Discord Bot online as ${client.user.tag}`);
    try { await registerCommands(); } catch (error) { console.error('Discord command registration failed:', error); }
  });

  client.on('guildMemberAdd', async member => {
    const memberRole = member.guild.roles.cache.find(role => role.name === 'Member');
    if (memberRole && member.guild.members.me?.permissions.has(PermissionFlagsBits.ManageRoles) && memberRole.position < member.guild.members.me.roles.highest.position) await member.roles.add(memberRole).catch(() => {});
    const channel = findChannel(member.guild, 'welcome');
    if (channel && channel.type === ChannelType.GuildText) {
      const embed = new EmbedBuilder().setTitle('New Member / Novo Membro').setDescription(`Welcome ${member}! / Bem-vindo ${member}!\n\nPlease read **#rules** and choose your notification preferences below.\nLeia **#rules** e escolha abaixo suas preferências de notificação.`).setColor(0x2ECC71).setThumbnail(member.user.displayAvatarURL()).setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }
    await logEvent(member.guild, 'Member Joined', `${member} (${member.user.tag})\nID: \`${member.id}\``, 0x2ECC71);
  });

  client.on('guildMemberRemove', async member => {
    await logEvent(member.guild, 'Member Left', `${member.user.tag}\nID: \`${member.id}\``, 0x95A5A6);
  });

  client.on('messageDelete', async message => {
    if (!message.guild || message.author?.bot) return;
    await logEvent(message.guild, 'Message Deleted', `Author: ${message.author?.tag || 'Unknown'}\nChannel: ${message.channel}\nContent: ${message.content?.slice(0, 1000) || '[No text content]'}`, 0xE74C3C);
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
    await logEvent(newMessage.guild, 'Message Edited', `Author: ${newMessage.author?.tag || 'Unknown'}\nChannel: ${newMessage.channel}\nBefore: ${oldMessage.content?.slice(0, 500) || '[empty]'}\nAfter: ${newMessage.content?.slice(0, 500) || '[empty]'}`, 0xF1C40F);
  });

  client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot || !message.member) return;
    if (!canAutoModerate(message.member, message.guild)) return;
    const now = Date.now();
    const recent = spamTracker.get(message.author.id) || [];
    const active = recent.filter(timestamp => now - timestamp < SPAM_WINDOW_MS);
    active.push(now);
    spamTracker.set(message.author.id, active);
    if (active.length >= SPAM_LIMIT) {
      spamTracker.set(message.author.id, []);
      await message.member.timeout(60_000, 'Node Hub automatic anti-spam').catch(() => {});
      await logEvent(message.guild, 'Automatic Anti-Spam', `${message.author} was timed out for 60 seconds after sending too many messages too quickly. Protected roles are excluded.`, 0xE67E22);
      await message.channel.send({ content: `${message.author}, please slow down. / Por favor, diminua o ritmo.` }).catch(() => {});
    }
  });

  client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId.startsWith('pref:')) {
      const key = interaction.customId.slice(5);
      const pref = ROLE_PREFERENCES[key];
      if (!pref || !interaction.guild || !interaction.member) return interaction.reply({ content: 'Preference unavailable.', ephemeral: true });
      const role = interaction.guild.roles.cache.find(r => r.name === pref.role);
      if (!role) return interaction.reply({ content: 'Role is not configured yet.', ephemeral: true });
      const hasRole = interaction.member.roles.cache.has(role.id);
      try {
        if (hasRole) await interaction.member.roles.remove(role);
        else await interaction.member.roles.add(role);
        await interaction.reply({ content: hasRole ? `Removed: ${pref.en} / ${pref.pt}` : `Enabled: ${pref.en} / ${pref.pt}`, ephemeral: true });
      } catch (error) {
        await interaction.reply({ content: 'I could not update your preference. Please contact a moderator.', ephemeral: true });
      }
      return;
    }
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'setup-server') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Administrator permission is required.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      try { await setupServer(interaction.guild); await interaction.editReply('Node Hub server structure, hierarchy, moderation protection and notification preferences are ready.'); }
      catch (error) { console.error(error); await interaction.editReply(`Setup failed: ${error.message}`); }
    }
    if (interaction.commandName === 'post-rules') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: 'Manage Server permission is required.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      try { await postRules(interaction.guild); await interaction.editReply('Rules posted successfully.'); } catch (error) { await interaction.editReply(`Could not post rules: ${error.message}`); }
    }
    if (interaction.commandName === 'post-welcome') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: 'Manage Server permission is required.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      try { await postWelcome(interaction.guild); await postPreferencePanel(interaction.guild); await interaction.editReply('Welcome and notification preference panels are ready.'); } catch (error) { await interaction.editReply(`Could not post welcome: ${error.message}`); }
    }
    if (interaction.commandName === 'node-status') await interaction.reply({ content: `**Node Hub Status**\nDiscord: Online\nBot: ${client.user.tag}\nLatency: ${client.ws.ping}ms` });
  });
}

const server = express();
server.use(express.json({ limit: '1mb' }));
server.use(require('express').static(require('path').join(__dirname, '..')));
server.get('/', (_req, res) => res.sendFile(require('path').join(__dirname, '..', 'index.html')));
server.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'Node Hub' }));
server.get('/webhook', (_req, res) => res.redirect(302, '/'));
server.post('/webhook', (req, res) => {
  console.log('Upland webhook received:', JSON.stringify(req.body || {}));
  return res.status(200).json({ status: 'ok' });
});
server.use((_req, res) => res.status(404).json({ status: 404, message: 'Not Found' }));
const PORT = Number(process.env.PORT || 10000);
server.listen(PORT, '0.0.0.0', () => console.log(`Node Hub webhook server listening on port ${PORT}`));
if (discordEnabled) client.login(TOKEN).catch(error => console.error('Discord login failed:', error));
