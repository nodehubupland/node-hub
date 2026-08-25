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
  ],
}) : null;

const ROLE_DEFINITIONS = [
  { name: 'Founder', color: 0xF5A623 }, { name: 'Administrator', color: 0xE74C3C },
  { name: 'Lead Developer', color: 0x9B59B6 }, { name: 'Developer', color: 0x3498DB },
  { name: 'Moderator', color: 0x2ECC71 }, { name: 'Partner', color: 0x1ABC9C },
  { name: 'Verified', color: 0xF1C40F }, { name: 'Uplander', color: 0x95A5A6 },
  { name: 'Member', color: 0x7F8C8D }, { name: 'Bot', color: 0x5865F2 },
];

const PUBLIC_STRUCTURE = [
  { name: '📌 START HERE', channels: ['welcome', 'rules', 'announcements'] },
  { name: '🌐 COMMUNITY', channels: ['general', 'upland', 'suggestions'] },
  { name: '🤖 NODE HUB', channels: ['getting-started', 'support'] },
  { name: '🌎 UPLAND', channels: ['upland-alerts', 'upland-data'] },
  { name: '💰 SUPPORT NODE HUB', channels: ['donate'] },
];
const TEAM_STRUCTURE = ['team-chat', 'tasks', 'development', 'internal-bugs', 'node-status', 'event-log'];
const TEAM_ROLES = new Set(['Founder', 'Administrator', 'Lead Developer', 'Developer', 'Moderator']);
const spamTracker = new Map();
const SPAM_LIMIT = 6;
const SPAM_WINDOW_MS = 8000;

const RULES = `**NODE HUB COMMUNITY RULES**\n\nWelcome to Node Hub. This community is built around Upland, Node Hub development, automation, tools, and technology. Keep the server useful, respectful, and safe.\n\n**1. Be respectful**\nTreat other members with respect. Harassment, personal attacks, hate speech, threats, and targeted abuse are not allowed.\n\n**2. No spam or flooding**\nDo not flood channels with repeated messages, mentions, emojis, or unwanted content.\n\n**3. No scams or fraud**\nScams, phishing, impersonation, fake giveaways, fraudulent offers, and attempts to steal accounts or assets are prohibited.\n\n**4. No malicious links or files**\nDo not post malware, suspicious files, phishing links, or anything designed to compromise another user or system.\n\n**5. Keep content in the right channel**\nUse the appropriate channel for your topic. Avoid unnecessary advertising or self-promotion outside permitted areas.\n\n**6. Respect privacy**\nDo not share another person's private information, credentials, API keys, tokens, or personal data.\n\n**7. Upland content**\nDiscussion about Upland is welcome. Follow Upland's rules and terms. Node Hub is an independent community project and is not an official Upland server unless explicitly stated.\n\n**8. No impersonation**\nDo not impersonate Node Hub staff, developers, Upland staff, or other members.\n\n**9. Follow staff instructions**\nModerators may remove content, issue warnings, timeout members, or take other moderation action when necessary to protect the community.\n\n**10. Use common sense**\nIf something is clearly harmful, disruptive, illegal, or intended to damage the community, do not post it.\n\n**Moderation**\nRules may be updated as Node Hub grows. Serious violations may result in immediate removal or ban.\n\nBy participating in Node Hub, you agree to follow these rules.`;

function slug(name) { return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); }
function findChannel(guild, name) { return guild.channels.cache.find(c => c.type === ChannelType.GuildText && c.name === slug(name)); }
function findLogChannel(guild) { return findChannel(guild, 'event-log'); }

async function logEvent(guild, title, description, color = 0x5865F2) {
  const channel = findLogChannel(guild);
  if (!channel) return;
  const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp();
  try { await channel.send({ embeds: [embed] }); } catch (error) { console.error('Event log failed:', error.message); }
}

async function getOrCreateRole(guild, definition) {
  let role = guild.roles.cache.find(r => r.name === definition.name);
  if (!role) role = await guild.roles.create({ name: definition.name, color: definition.color, reason: 'Node Hub initial Discord setup' });
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
  if (!channel) channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildText, parent: parent.id, reason: 'Node Hub initial Discord setup' });
  else if (channel.parentId !== parent.id) await channel.setParent(parent.id, { lockPermissions: false });
  if (privateChannel) {
    await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
    for (const roleId of teamRoleIds) await channel.permissionOverwrites.edit(roleId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
  }
  return channel;
}

async function postRules(guild) {
  const channel = findChannel(guild, 'rules');
  if (!channel) throw new Error('rules channel does not exist. Run /setup-server first.');
  const recent = await channel.messages.fetch({ limit: 20 });
  const existing = recent.find(message => message.author.id === client.user.id && message.embeds.some(embed => embed.title === 'Node Hub Community Rules'));
  if (existing) return existing;
  const embed = new EmbedBuilder().setTitle('Node Hub Community Rules').setDescription(RULES).setColor(0xF5A623).setFooter({ text: 'Node Hub • Please read before participating' }).setTimestamp();
  return channel.send({ embeds: [embed] });
}

async function postWelcome(guild) {
  const channel = findChannel(guild, 'welcome');
  if (!channel) throw new Error('welcome channel does not exist. Run /setup-server first.');
  const recent = await channel.messages.fetch({ limit: 20 });
  const existing = recent.find(message => message.author.id === client.user.id && message.embeds.some(embed => embed.title === 'Welcome to Node Hub'));
  if (existing) return existing;
  const embed = new EmbedBuilder()
    .setTitle('Welcome to Node Hub')
    .setDescription('Welcome to the Node Hub community.\n\nNode Hub is focused on Upland, development, automation, tools, and technology.\n\n📜 Read **#rules** before participating.\n💬 Meet the community in **#general**.\n🎮 Discuss Upland in **#upland**.\n🆘 Need help? Use **#support**.\n💡 Have an idea? Use **#suggestions**.')
    .setColor(0x5865F2)
    .setFooter({ text: 'Node Hub' })
    .setTimestamp();
  return channel.send({ embeds: [embed] });
}

async function setupServer(guild) {
  const roles = {};
  for (const definition of ROLE_DEFINITIONS) roles[definition.name] = await getOrCreateRole(guild, definition);
  const teamRoleIds = ROLE_DEFINITIONS.filter(r => TEAM_ROLES.has(r.name)).map(r => roles[r.name].id);
  for (const section of PUBLIC_STRUCTURE) {
    const category = await getOrCreateCategory(guild, section.name);
    for (const name of section.channels) await getOrCreateTextChannel(guild, name, category);
  }
  const teamCategory = await getOrCreateCategory(guild, '🟧 TEAM', true, teamRoleIds);
  for (const name of TEAM_STRUCTURE) await getOrCreateTextChannel(guild, name, teamCategory, true, teamRoleIds);
  await postRules(guild);
  await postWelcome(guild);
  await logEvent(guild, 'Node Hub Setup', 'Initial server structure, rules, and welcome message are ready.', 0x2ECC71);
  return { roles, teamCategory };
}

const commands = [
  new SlashCommandBuilder().setName('setup-server').setDescription('Create the initial Node Hub Discord structure.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator.toString()),
  new SlashCommandBuilder().setName('post-rules').setDescription('Post or refresh the Node Hub community rules.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),
  new SlashCommandBuilder().setName('post-welcome').setDescription('Post or refresh the Node Hub welcome message.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),
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
    const channel = findChannel(member.guild, 'welcome');
    if (channel) {
      const embed = new EmbedBuilder().setTitle('Welcome to Node Hub').setDescription(`Welcome ${member}!\n\nPlease read **#rules** before participating.\n\nExplore **#general**, **#upland**, and **#getting-started** to learn more.`).setColor(0x2ECC71).setThumbnail(member.user.displayAvatarURL()).setTimestamp();
      await channel.send({ embeds: [embed] }).catch(() => {});
    }
    const memberRole = member.guild.roles.cache.find(role => role.name === 'Member');
    if (memberRole && member.guild.members.me.permissions.has(PermissionFlagsBits.ManageRoles) && memberRole.position < member.guild.members.me.roles.highest.position) await member.roles.add(memberRole).catch(() => {});
    await logEvent(member.guild, 'Member Joined', `${member} (${member.user.tag})\nID: \`${member.id}\``, 0x2ECC71);
  });

  client.on('guildMemberRemove', async member => {
    await logEvent(member.guild, 'Member Left', `${member.user.tag}\nID: \`${member.id}\``, 0x95A5A6);
  });

  client.on('messageDelete', async message => {
    if (!message.guild || message.author?.bot) return;
    const content = message.content?.slice(0, 1000) || '[No text content]';
    await logEvent(message.guild, 'Message Deleted', `Author: ${message.author?.tag || 'Unknown'}\nChannel: ${message.channel}\nContent: ${content}`, 0xE74C3C);
  });

  client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!newMessage.guild || newMessage.author?.bot || oldMessage.content === newMessage.content) return;
    await logEvent(newMessage.guild, 'Message Edited', `Author: ${newMessage.author?.tag || 'Unknown'}\nChannel: ${newMessage.channel}\nBefore: ${oldMessage.content?.slice(0, 500) || '[empty]'}\nAfter: ${newMessage.content?.slice(0, 500) || '[empty]'}`, 0xF1C40F);
  });

  client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    const now = Date.now();
    const recent = spamTracker.get(message.author.id) || [];
    const active = recent.filter(timestamp => now - timestamp < SPAM_WINDOW_MS);
    active.push(now);
    spamTracker.set(message.author.id, active);
    if (active.length >= SPAM_LIMIT) {
      spamTracker.set(message.author.id, []);
      if (message.member?.moderatable && message.guild.members.me.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        await message.member.timeout(60_000, 'Node Hub automatic anti-spam').catch(() => {});
        await logEvent(message.guild, 'Automatic Anti-Spam', `${message.author} was timed out for 60 seconds after sending too many messages too quickly.`, 0xE67E22);
        await message.channel.send({ content: `${message.author}, please slow down. Anti-spam protection has temporarily timed you out.` }).catch(() => {});
      }
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'setup-server') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.Administrator)) return interaction.reply({ content: 'Administrator permission is required.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      try { await setupServer(interaction.guild); await interaction.editReply('Node Hub server structure, rules, and welcome system are ready.'); }
      catch (error) { console.error(error); await interaction.editReply(`Setup failed: ${error.message}`); }
    }
    if (interaction.commandName === 'post-rules') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: 'Manage Server permission is required.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      try { await postRules(interaction.guild); await logEvent(interaction.guild, 'Rules Published', `${interaction.user} published the Node Hub rules.`, 0xF5A623); await interaction.editReply('Rules posted successfully.'); }
      catch (error) { await interaction.editReply(`Could not post rules: ${error.message}`); }
    }
    if (interaction.commandName === 'post-welcome') {
      if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) return interaction.reply({ content: 'Manage Server permission is required.', ephemeral: true });
      await interaction.deferReply({ ephemeral: true });
      try { await postWelcome(interaction.guild); await interaction.editReply('Welcome message posted successfully.'); }
      catch (error) { await interaction.editReply(`Could not post welcome message: ${error.message}`); }
    }
    if (interaction.commandName === 'node-status') await interaction.reply({ content: `**Node Hub Status**\nDiscord: Online\nBot: ${client.user.tag}\nLatency: ${client.ws.ping}ms` });
  });
}

const server = express();
server.use(express.json({ limit: '1mb' }));

server.use(require('express').static(require('path').join(__dirname, '..')));

server.get('/', (_req, res) => res.sendFile(require('path').join(__dirname, '..', 'index.html')));
server.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'Node Hub' }));

// Browser visits to the Upland webhook URL should land on the public Node Hub site.
// Upland continues to use POST /webhook for webhook delivery.
server.get('/webhook', (_req, res) => res.redirect(302, '/'));
server.post('/webhook', (req, res) => {
  console.log('Upland webhook received:', JSON.stringify(req.body || {}));
  return res.status(200).json({ status: 'ok' });
});

server.use((_req, res) => res.status(404).json({ status: 404, message: 'Not Found' }));
const PORT = Number(process.env.PORT || 10000);
server.listen(PORT, '0.0.0.0', () => console.log(`Node Hub webhook server listening on port ${PORT}`));

if (discordEnabled) client.login(TOKEN).catch(error => console.error('Discord login failed:', error));
