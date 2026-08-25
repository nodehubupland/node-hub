const { Client, ChannelType, PermissionFlagsBits } = require('discord.js');

const FINAL_STRUCTURE = [
  { category: '📌 START HERE', text: ['welcome', 'rules', 'announcements', 'donate'] },
  { category: '🌐 COMMUNITY', text: ['general', 'treasure-hunt', 'events', 'community-promo'] },
  { category: '🌎 UPLAND', text: ['upland-guide', 'treasure-results', 'daily-ranking', 'player-stats', 'bsts-properties', 'bsts-assets', 'sold', 'listing-alerts', 'upland-alerts'] },
  { category: '🤖 NODE HUB', text: ['getting-started', 'leaderboard'] },
  { category: '🔊 VOICE', voice: ['Upland', 'Launches', 'Node Hub', 'General'] },
  { category: '🆘 SUPPORT', text: ['open-ticket'] },
];

const BOT_ONLY = new Set([
  'rules', 'announcements', 'donate', 'upland-guide', 'treasure-results', 'daily-ranking', 'player-stats',
  'listing-alerts', 'upland-alerts', 'getting-started', 'leaderboard', 'open-ticket',
]);

const OPEN = new Set(['general', 'treasure-hunt', 'community-promo', 'bsts-properties', 'bsts-assets', 'sold']);
const EVENTS = 'events';

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function category(guild, name) {
  let c = guild.channels.cache.find(x => x.type === ChannelType.GuildCategory && x.name === name);
  if (!c) c = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'Node Hub final Discord structure' });
  return c;
}

async function textChannel(guild, name, parent) {
  const channelName = slug(name);
  let c = guild.channels.cache.find(x => x.type === ChannelType.GuildText && x.name === channelName);
  if (!c) c = guild.channels.cache.find(x => x.isTextBased?.() && x.name === channelName && x.type === ChannelType.GuildAnnouncement);
  if (!c) c = await guild.channels.create({ name: channelName, type: ChannelType.GuildText, parent: parent.id, reason: 'Node Hub final Discord structure' });
  else if (c.parentId !== parent.id) await c.setParent(parent.id, { lockPermissions: false });
  return c;
}

async function announcementChannel(guild, name, parent) {
  const channelName = slug(name);
  let c = guild.channels.cache.find(x => x.name === channelName && (x.type === ChannelType.GuildText || x.type === ChannelType.GuildAnnouncement));
  if (!c) c = await guild.channels.create({ name: channelName, type: ChannelType.GuildAnnouncement, parent: parent.id, reason: 'Node Hub announcements channel' });
  else if (c.parentId !== parent.id) await c.setParent(parent.id, { lockPermissions: false });
  if (c.type === ChannelType.GuildText) await c.setType(ChannelType.GuildAnnouncement, 'Convert Node Hub announcements to Announcement Channel').catch(() => {});
  return c;
}

async function voiceChannel(guild, name, parent) {
  const channelName = slug(name);
  let c = guild.channels.cache.find(x => x.type === ChannelType.GuildVoice && x.name === channelName);
  if (!c) c = await guild.channels.create({ name: channelName, type: ChannelType.GuildVoice, parent: parent.id, reason: 'Node Hub voice structure' });
  else if (c.parentId !== parent.id) await c.setParent(parent.id, { lockPermissions: false });
  return c;
}

async function lockBotChannel(channel, guild) {
  await channel.permissionOverwrites.edit(guild.roles.everyone, {
    ViewChannel: true,
    SendMessages: false,
    AddReactions: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
  }).catch(() => {});
}

async function openChannel(channel, guild) {
  await channel.permissionOverwrites.edit(guild.roles.everyone, {
    ViewChannel: true,
    SendMessages: true,
    AddReactions: true,
  }).catch(() => {});
}

async function configure(guild) {
  const categories = new Map();
  for (const section of FINAL_STRUCTURE) categories.set(section.category, await category(guild, section.category));

  for (const section of FINAL_STRUCTURE) {
    const parent = categories.get(section.category);
    for (const name of section.text || []) {
      const c = name === 'announcements'
        ? await announcementChannel(guild, name, parent)
        : await textChannel(guild, name, parent);

      if (BOT_ONLY.has(slug(name))) await lockBotChannel(c, guild);
      else if (name === EVENTS) await lockBotChannel(c, guild);
      else if (OPEN.has(slug(name))) await openChannel(c, guild);
      else await openChannel(c, guild);
    }
    for (const name of section.voice || []) await voiceChannel(guild, name, parent);
  }

  const rules = guild.channels.cache.find(c => c.name === 'rules' && c.type === ChannelType.GuildText);
  if (rules) await guild.setRulesChannel(rules, 'Node Hub official Discord rules channel').catch(error => console.error('Could not set official rules channel:', error.message));

  const announcements = guild.channels.cache.find(c => c.name === 'announcements' && c.type === ChannelType.GuildAnnouncement);
  if (announcements) await guild.setPublicUpdatesChannel(announcements, 'Node Hub community announcements channel').catch(() => {});

  console.log(`Node Hub final Discord structure synchronized for ${guild.name}.`);
}

const originalLogin = Client.prototype.login;
Client.prototype.login = function patchedLogin(token) {
  if (!this.__nodeHubStructureFinalizer) {
    this.__nodeHubStructureFinalizer = true;
    this.once('ready', () => {
      for (const guild of this.guilds.cache.values()) configure(guild).catch(error => console.error('Discord structure finalizer failed:', error));
    });
    this.on('interactionCreate', interaction => {
      if (interaction.isChatInputCommand?.() && interaction.commandName === 'setup-server' && interaction.guild) {
        setTimeout(() => configure(interaction.guild).catch(error => console.error('Post-setup Discord synchronization failed:', error)), 5000);
      }
    });
  }
  return originalLogin.call(this, token);
};
