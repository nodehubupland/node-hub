require('dotenv').config();
require('./force-structure');

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
const UPLAND_APP_ID = process.env.UPLAND_APP_ID;
const UPLAND_SECRET_KEY = process.env.UPLAND_SECRET_KEY;
const discordEnabled = Boolean(TOKEN && CLIENT_ID);

if (!discordEnabled) console.warn('Discord bot credentials are not configured. Starting webhook server only.');
if (!UPLAND_APP_ID || !UPLAND_SECRET_KEY) console.warn('Upland API credentials are not configured. /treasure will be unavailable.');

const client = discordEnabled ? new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent, GatewayIntentBits.GuildVoiceStates] }) : null;

const ROLE_DEFINITIONS = [
  { name: 'Founder', color: 0xF5A623 }, { name: 'Administrator', color: 0xE74C3C }, { name: 'Developer', color: 0x9B59B6 }, { name: 'Moderator', color: 0x2ECC71 }, { name: 'Partner', color: 0x1ABC9C }, { name: 'Creator', color: 0x9B59B6 }, { name: 'Legend', color: 0xF1C40F }, { name: 'Elite', color: 0xE67E22 }, { name: 'Contrib', color: 0x3498DB }, { name: 'Active', color: 0x2ECC71 }, { name: 'Uplander', color: 0x95A5A6 }, { name: 'Member', color: 0x7F8C8D }, { name: 'Verified', color: 0xF1C40F }, { name: 'Bot', color: 0x5865F2 }, { name: 'Upland Listings', color: 0x3498DB }, { name: 'Treasure Hunt', color: 0xF5A623 }, { name: 'Upland News', color: 0xE67E22 }, { name: 'Node Hub Content', color: 0x9B59B6 }, { name: 'Community', color: 0x1ABC9C },
];

const PUBLIC_STRUCTURE = [
  { name: '📌 START HERE', channels: ['welcome', 'rules', 'announcements', 'donate'] },
  { name: '🌐 COMMUNITY', channels: ['general', 'treasure-hunt', 'events', 'community-promo'] },
  { name: '🌎 UPLAND', channels: ['upland-guide', 'treasure-results', 'daily-ranking', 'player-stats', 'bsts-properties', 'bsts-assets', 'sold', 'listing-alerts', 'upland-alerts'] },
  { name: '🤖 NODE HUB', channels: ['getting-started', 'leaderboard'] },
  { name: '🔊 VOICE', channels: ['Upland', 'Launches', 'Node Hub', 'General'] },
  { name: '🆘 SUPPORT', channels: ['open-ticket'] },
];
const AUTOMATION_CHANNELS = new Set(['rules', 'announcements', 'donate', 'upland-guide', 'treasure-results', 'daily-ranking', 'player-stats', 'listing-alerts', 'upland-alerts', 'getting-started', 'leaderboard', 'open-ticket', 'node-status', 'event-log']);
const TEAM_STRUCTURE = ['support-tickets', 'team-chat', 'tasks', 'development', 'internal-bugs', 'node-status', 'event-log'];
const TEAM_ROLES = new Set(['Founder', 'Administrator', 'Bot', 'Moderator', 'Developer']);
const NOTIFICATION_ROLES = new Set(['Upland Listings', 'Treasure Hunt', 'Upland News', 'Node Hub Content', 'Community']);
const PROTECTED_ROLES = new Set(['Founder', 'Administrator']);
const spamTracker = new Map(); const SPAM_LIMIT = 6; const SPAM_WINDOW_MS = 8000;
const ROLE_PREFERENCES = { listings: { role: 'Upland Listings', emoji: '🏠', en: 'Upland Listings', pt: 'Listagens de Upland' }, treasure: { role: 'Treasure Hunt', emoji: '🏆', en: 'Treasure Hunt', pt: 'Caça ao Tesouro' }, news: { role: 'Upland News', emoji: '📰', en: 'Upland News', pt: 'Notícias do Upland' }, content: { role: 'Node Hub Content', emoji: '📺', en: 'Node Hub Content', pt: 'Conteúdo do Node Hub' }, community: { role: 'Community', emoji: '🌎', en: 'Community', pt: 'Comunidade' } };

function slug(name) { return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, ''); }
function findChannel(guild, name) { return guild.channels.cache.find(c => (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement || c.type === ChannelType.GuildVoice) && c.name === slug(name)); }
function findLogChannel(guild) { return findChannel(guild, 'event-log'); }
async function logEvent(guild, title, description, color = 0x5865F2) { const channel = findLogChannel(guild); if (!channel || channel.type !== ChannelType.GuildText) return; const embed = new EmbedBuilder().setTitle(title).setDescription(description).setColor(color).setTimestamp(); try { await channel.send({ embeds: [embed] }); } catch (error) { console.error('Event log failed:', error.message); } }
async function getOrCreateRole(guild, definition) { let role = guild.roles.cache.find(r => r.name === definition.name); if (!role) role = await guild.roles.create({ name: definition.name, color: definition.color, reason: 'Node Hub server setup' }); return role; }
async function getOrCreateCategory(guild, name, privateCategory = false, teamRoleIds = []) { let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === name); if (!category) category = await guild.channels.create({ name, type: ChannelType.GuildCategory }); if (privateCategory) { await category.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }); for (const roleId of teamRoleIds) await category.permissionOverwrites.edit(roleId, { ViewChannel: true }); } return category; }
async function getOrCreateTextChannel(guild, name, parent, privateChannel = false, teamRoleIds = []) { const channelName = slug(name); let channel = guild.channels.cache.find(c => (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) && c.name === channelName); if (!channel) channel = await guild.channels.create({ name: channelName, type: name === 'announcements' ? ChannelType.GuildAnnouncement : ChannelType.GuildText, parent: parent.id, reason: 'Node Hub server setup' }); else if (channel.parentId !== parent.id) await channel.setParent(parent.id, { lockPermissions: false }); if (privateChannel) { await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }); for (const roleId of teamRoleIds) await channel.permissionOverwrites.edit(roleId, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true }); } if (!privateChannel && AUTOMATION_CHANNELS.has(channelName)) await channel.permissionOverwrites.edit(guild.roles.everyone, { SendMessages: false }); return channel; }
async function getOrCreateVoiceChannel(guild, name, parent) { const channelName = slug(name); let channel = guild.channels.cache.find(c => c.type === ChannelType.GuildVoice && c.name === channelName); if (!channel) channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildVoice, parent: parent.id, reason: 'Node Hub voice setup' }); else if (channel.parentId !== parent.id) await channel.setParent(parent.id, { lockPermissions: false }); return channel; }

async function setupServer(guild) { const roles = {}; for (const definition of ROLE_DEFINITIONS) roles[definition.name] = await getOrCreateRole(guild, definition); const teamRoleIds = ROLE_DEFINITIONS.filter(r => TEAM_ROLES.has(r.name)).map(r => roles[r.name].id); for (const section of PUBLIC_STRUCTURE) { const category = await getOrCreateCategory(guild, section.name); for (const name of section.channels) { if (section.name === '🔊 VOICE') await getOrCreateVoiceChannel(guild, name, category); else await getOrCreateTextChannel(guild, name, category); } } const teamCategory = await getOrCreateCategory(guild, '🟧 TEAM', true, teamRoleIds); for (const name of TEAM_STRUCTURE) await getOrCreateTextChannel(guild, name, teamCategory, true, teamRoleIds); await logEvent(guild, 'Node Hub Setup', 'Server structure, roles and permissions are ready.', 0x2ECC71); }
async function postRules(guild) { const channel = findChannel(guild, 'rules'); if (!channel) return; const recent = await channel.messages.fetch({ limit: 20 }); if (recent.some(m => m.author.id === client.user.id && m.embeds.some(e => e.title === 'Node Hub Community Rules'))) return; await channel.send({ embeds: [new EmbedBuilder().setTitle('Node Hub Community Rules / Regras da Comunidade').setDescription('**English**\n1. Be respectful.\n2. No spam or flooding.\n3. No scams or fraud.\n4. No malicious links or files.\n5. Use the correct channel.\n6. Respect privacy.\n7. Follow Upland rules.\n8. No impersonation.\n9. Follow staff instructions.\n10. Use common sense.\n\n**Português**\nRespeite os membros, não faça spam, golpes, phishing ou impersonação. Use o canal correto, preserve a privacidade, siga as regras do Upland e as orientações da equipe.').setColor(0xF5A623).setTimestamp()] }); }
async function postWelcome(guild) { const channel = findChannel(guild, 'welcome'); if (!channel) return; const recent = await channel.messages.fetch({ limit: 50 }); if (recent.some(m => m.author.id === client.user.id && m.embeds.some(e => e.title === 'Welcome to Node Hub'))) return; await channel.send({ embeds: [new EmbedBuilder().setTitle('Welcome to Node Hub / Bem-vindo ao Node Hub').setDescription('**English**\nWelcome to Node Hub. Read **#rules**, explore the community and choose your notification preferences.\n\n**Português**\nBem-vindo ao Node Hub. Leia **#rules**, conheça a comunidade e escolha suas preferências de notificação.').setColor(0x5865F2).setTimestamp()] }); }
async function postPreferencePanel(guild) { const channel = findChannel(guild, 'welcome'); if (!channel) return; const recent = await channel.messages.fetch({ limit: 50 }); if (recent.some(m => m.author.id === client.user.id && m.embeds.some(e => e.title === 'Notification Preferences / Preferências de Notificação'))) return; const buttons = Object.entries(ROLE_PREFERENCES).map(([key,p]) => new ButtonBuilder().setCustomId(`pref:${key}`).setLabel(`${p.emoji} ${p.en}`).setStyle(ButtonStyle.Secondary)); await channel.send({ embeds: [new EmbedBuilder().setTitle('Notification Preferences / Preferências de Notificação').setDescription('Choose what you want to receive. Click again to remove it.\n\nEscolha o que deseja receber. Clique novamente para remover.').setColor(0x5865F2)], components: [new ActionRowBuilder().addComponents(buttons.slice(0,3)), new ActionRowBuilder().addComponents(buttons.slice(3))] }); }

function normalizeIgn(input) { return input.trim().replace(/^@/, '').replace(/\s+/g, '').toLowerCase(); }
function basicUplandAuth() { return 'Basic ' + Buffer.from(`${UPLAND_APP_ID}:${UPLAND_SECRET_KEY}`).toString('base64'); }
async function fetchTreasureHistory(ign) {
  if (!UPLAND_APP_ID || !UPLAND_SECRET_KEY) throw new Error('Upland API is not configured yet.');
  const rows = [];
  const pageSize = 100;
  for (let page = 1; page <= 10; page++) {
    const url = `https://api.prod.upland.me/developers-api/treasures-history?currentPage=${page}&pageSize=${pageSize}`;
    const response = await fetch(url, { headers: { Authorization: basicUplandAuth(), Accept: 'application/json' } });
    if (!response.ok) throw new Error(`Upland API returned ${response.status}.`);
    const body = await response.json();
    const results = Array.isArray(body?.results) ? body.results : Array.isArray(body?.results?.results) ? body.results.results : [];
    if (!results.length) break;
    for (const item of results) if (normalizeIgn(item.userName || '') === ign) rows.push(item);
    if (results.length < pageSize) break;
  }
  return rows;
}
function formatUpx(value) { return `${Number(value || 0).toLocaleString('en-US')} UPX`; }
async function buildTreasureEmbed(ign) {
  const rows = await fetchTreasureHistory(ign);
  if (!rows.length) return new EmbedBuilder().setTitle('🏆 Treasure Hunt').setDescription(`No public treasure history found for **${ign}**.`).setColor(0xF5A623);
  const totalReward = rows.reduce((sum, r) => sum + Number(r.reward || 0), 0);
  const cities = [...new Set(rows.map(r => String(r.fullAddress || '').split(',').slice(-3, -2)[0]?.trim()).filter(Boolean))];
  const last = rows.slice().sort((a,b) => new Date(b.lockedAt || b.spawnAt || 0) - new Date(a.lockedAt || a.spawnAt || 0))[0];
  const recent = rows.slice().sort((a,b) => new Date(b.lockedAt || b.spawnAt || 0) - new Date(a.lockedAt || a.spawnAt || 0)).slice(0, 10);
  const history = recent.map((r, i) => `${i + 1}. **${formatUpx(r.reward)}** · ${r.treasureType || 'treasure'} · ${r.fullAddress || 'Unknown location'}`).join('\n');
  return new EmbedBuilder().setTitle('🏆 TREASURE HUNT RESULT').setDescription(`👤 **Player:** ${ign}\n🏙️ **City:** ${cities[0] || 'Unknown'}\n\n💵 **Public Revenue:** ${formatUpx(totalReward)}\n📦 **Chests:** ${rows.length}\n\n**Latest results**\n${history}\n\n> Cost, Profit, ROI, Sparklets and Sends Used will only be shown when the public Upland data source provides enough information to calculate them reliably.`).setColor(0xF5A623).setTimestamp();
}

const commands = [
  new SlashCommandBuilder().setName('setup-server').setDescription('Create or update Node Hub Discord structure.').setDefaultMemberPermissions(PermissionFlagsBits.Administrator.toString()),
  new SlashCommandBuilder().setName('post-rules').setDescription('Post community rules.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),
  new SlashCommandBuilder().setName('post-welcome').setDescription('Post welcome and preferences.').setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild.toString()),
  new SlashCommandBuilder().setName('node-status').setDescription('Show Node Hub bot status.'),
  new SlashCommandBuilder().setName('treasure').setDescription('Show public Upland treasure history for a player.').addStringOption(option => option.setName('igname').setDescription('Upland IG Name, exactly as shown in the game.').setRequired(true)),
].map(c => c.toJSON());
async function registerCommands() { const rest = new REST({ version: '10' }).setToken(TOKEN); if (GUILD_ID) await rest.put(Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID), { body: commands }); else await rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands }); }

if (discordEnabled) {
  client.once('ready', async () => { console.log(`Node Hub Discord Bot online as ${client.user.tag}`); try { await registerCommands(); } catch (error) { console.error('Discord command registration failed:', error); } });
  client.on('guildMemberAdd', async member => { const channel = findChannel(member.guild, 'welcome'); if (channel) await channel.send({ content: `Welcome ${member}! / Bem-vindo ${member}!` }).catch(() => {}); const memberRole = member.guild.roles.cache.find(r => r.name === 'Member'); if (memberRole) await member.roles.add(memberRole).catch(() => {}); });
  client.on('messageCreate', async message => { if (!message.guild || message.author.bot) return; const now = Date.now(); const active = (spamTracker.get(message.author.id) || []).filter(t => now - t < SPAM_WINDOW_MS); active.push(now); spamTracker.set(message.author.id, active); if (active.length >= SPAM_LIMIT) { spamTracker.set(message.author.id, []); const m = message.member; const protectedMember = m?.id === message.guild.ownerId || m?.permissions.has(PermissionFlagsBits.Administrator) || m?.roles.cache.some(r => PROTECTED_ROLES.has(r.name)); const me = message.guild.members.me; if (!protectedMember && m?.moderatable && me?.permissions.has(PermissionFlagsBits.ModerateMembers)) await m.timeout(60000, 'Node Hub anti-spam').catch(() => {}); } });
  client.on('interactionCreate', async interaction => {
    if (interaction.isButton() && interaction.customId.startsWith('pref:')) { const key = interaction.customId.slice(5); const pref = ROLE_PREFERENCES[key]; const role = interaction.guild.roles.cache.find(r => r.name === pref?.role); if (!role) return interaction.reply({ content: 'Role unavailable.', ephemeral: true }); const has = interaction.member.roles.cache.has(role.id); if (has) await interaction.member.roles.remove(role); else await interaction.member.roles.add(role); return interaction.reply({ content: `${has ? 'Removed' : 'Added'}: ${pref.role}`, ephemeral: true }); }
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'setup-server') { await interaction.deferReply({ ephemeral: true }); try { await setupServer(interaction.guild); await interaction.editReply('Node Hub structure updated.'); } catch (e) { await interaction.editReply(`Setup failed: ${e.message}`); } }
    else if (interaction.commandName === 'post-rules') { await interaction.deferReply({ ephemeral: true }); await postRules(interaction.guild); await interaction.editReply('Rules posted.'); }
    else if (interaction.commandName === 'post-welcome') { await interaction.deferReply({ ephemeral: true }); await postWelcome(interaction.guild); await postPreferencePanel(interaction.guild); await interaction.editReply('Welcome panel posted.'); }
    else if (interaction.commandName === 'node-status') await interaction.reply({ content: `Node Hub Status\nDiscord: Online\nBot: ${client.user.tag}\nLatency: ${client.ws.ping}ms` });
    else if (interaction.commandName === 'treasure') { const ign = normalizeIgn(interaction.options.getString('igname', true)); await interaction.deferReply(); try { const embed = await buildTreasureEmbed(ign); await interaction.editReply({ embeds: [embed] }); } catch (error) { console.error('Treasure lookup failed:', error); await interaction.editReply(`🏆 Treasure Hunt\n\nUnable to retrieve the public Upland history right now. ${error.message}`); } }
  });
  client.login(TOKEN).catch(error => console.error('Discord login failed:', error));
}

const server = express(); server.use(express.json({ limit: '1mb' })); server.use(express.static(require('path').join(__dirname, '..'))); server.get('/', (_req,res) => res.sendFile(require('path').join(__dirname, '..', 'index.html'))); server.get('/health', (_req,res) => res.status(200).json({ status: 'ok', service: 'Node Hub' })); server.get('/webhook', (_req,res) => res.redirect(302, '/')); server.post('/webhook', (req,res) => { console.log('Upland webhook received:', JSON.stringify(req.body || {})); res.status(200).json({ status: 'ok' }); }); server.use((_req,res) => res.status(404).json({ status: 404, message: 'Not Found' })); const PORT = Number(process.env.PORT || 10000); server.listen(PORT, '0.0.0.0', () => console.log(`Node Hub webhook server listening on port ${PORT}`));