const { Client, ChannelType, PermissionFlagsBits } = require('discord.js');

const FINAL = {
  '📌 START HERE': ['welcome', 'rules', 'announcements', 'donate'],
  '🌐 COMMUNITY': ['general', 'treasure-hunt', 'events', 'community-promo'],
  '🌎 UPLAND': ['upland-guide', 'treasure-results', 'daily-ranking', 'player-stats', 'bsts-properties', 'bsts-assets', 'sold', 'listing-alerts', 'upland-alerts'],
  '🤖 NODE HUB': ['getting-started', 'leaderboard'],
  '🔊 VOICE': ['Upland', 'Launches', 'Node Hub', 'General'],
  '🆘 SUPPORT': ['open-ticket'],
  '🟧 TEAM': ['support-tickets', 'team-chat', 'tasks', 'development', 'internal-bugs', 'node-status', 'event-log'],
};

const ROLE_DEFINITIONS = [
  ['Founder', 0xF5A623, true], ['Administrator', 0xE74C3C, true], ['Bot', 0x5865F2, true],
  ['Moderator', 0x2ECC71], ['Developer', 0x3498DB], ['Partner', 0x1ABC9C], ['Creator', 0x9B59B6],
  ['Legend', 0xF1C40F], ['Elite', 0xE67E22], ['Contrib', 0x9B59B6], ['Active', 0x2ECC71],
  ['Member', 0x7F8C8D], ['Uplander', 0x95A5A6], ['Verified', 0xF1C40F],
  ['Upland Listings', 0x3498DB], ['Treasure Hunt', 0xF1C40F], ['Upland News', 0xE74C3C],
  ['Node Hub Content', 0x9B59B6], ['Community', 0x1ABC9C],
];

const TEAM = new Set(['Founder', 'Administrator', 'Bot', 'Moderator', 'Developer']);
const BOT_ONLY = new Set(['rules', 'announcements', 'donate', 'upland-guide', 'treasure-results', 'daily-ranking', 'player-stats', 'listing-alerts', 'upland-alerts', 'getting-started', 'leaderboard', 'open-ticket']);
const OPEN = new Set(['general', 'treasure-hunt', 'community-promo', 'bsts-properties', 'bsts-assets', 'sold']);
const OLD_CATEGORIES = new Set(['📊 UPLAND DATA', '💰 SUPPORT NODE HUB']);
const OLD_CHANNELS = new Set(['suggestions', 'partnerships', 'upland', 'upland-wins', 'upland-discussion', 'new-listings', 'support']);
const PROTECTED = new Set(['Founder', 'Administrator']);

const slug = value => value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

async function ensureRoles(guild) {
  for (const [name, color, protectedRole] of ROLE_DEFINITIONS) {
    let role = guild.roles.cache.find(r => r.name === name);
    if (!role) role = await guild.roles.create({ name, color, reason: 'Node Hub final role structure' });
    if (protectedRole && !role.permissions.has(PermissionFlagsBits.Administrator)) {
      await role.setPermissions(PermissionFlagsBits.Administrator, 'Node Hub protected staff role').catch(() => {});
    }
  }
  return new Map(guild.roles.cache.map(r => [r.name, r]));
}

async function sync(guild) {
  await guild.channels.fetch();
  await guild.roles.fetch();
  const roles = await ensureRoles(guild);
  const teamRoles = [...TEAM].map(name => roles.get(name)).filter(Boolean);

  const categories = new Map();
  for (const name of Object.keys(FINAL)) {
    let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === name);
    if (!category) category = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'Node Hub final Discord structure' });
    categories.set(name, category);
    if (name === '🟧 TEAM') {
      await category.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
      for (const role of teamRoles) await category.permissionOverwrites.edit(role, { ViewChannel: true });
    }
  }

  for (const [categoryName, channelNames] of Object.entries(FINAL)) {
    const parent = categories.get(categoryName);
    for (const name of channelNames) {
      const channelName = slug(name);
      const voice = categoryName === '🔊 VOICE';
      let channel = guild.channels.cache.find(c => c.name === channelName && (voice ? c.type === ChannelType.GuildVoice : (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)));
      if (!channel) {
        channel = await guild.channels.create({ name: channelName, type: voice ? ChannelType.GuildVoice : (name === 'announcements' ? ChannelType.GuildAnnouncement : ChannelType.GuildText), parent: parent.id, reason: 'Node Hub final Discord structure' });
      } else if (channel.parentId !== parent.id) {
        await channel.setParent(parent.id, { lockPermissions: false }).catch(() => {});
      }

      if (name === 'announcements' && channel.type === ChannelType.GuildText) {
        await channel.setType(ChannelType.GuildAnnouncement, 'Node Hub announcements channel').catch(() => {});
      }

      if (!voice) {
        if (categoryName === '🟧 TEAM') {
          await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
          for (const role of teamRoles) await channel.permissionOverwrites.edit(role, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true });
        } else if (BOT_ONLY.has(name) || name === 'events') {
          await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true, SendMessages: false, AddReactions: false, CreatePublicThreads: false, CreatePrivateThreads: false });
        } else if (OPEN.has(name)) {
          await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true, SendMessages: true, AddReactions: true });
        }
      }
    }
  }

  for (const channel of [...guild.channels.cache.values()]) {
    if (channel.type === ChannelType.GuildCategory) continue;
    if (OLD_CHANNELS.has(channel.name) || (channel.parent && OLD_CATEGORIES.has(channel.parent.name))) {
      await channel.delete('Remove obsolete Node Hub Discord structure').catch(() => {});
    }
  }
  for (const category of [...guild.channels.cache.values()].filter(c => c.type === ChannelType.GuildCategory && OLD_CATEGORIES.has(c.name))) {
    await category.delete('Remove obsolete Node Hub Discord category').catch(() => {});
  }

  const rules = guild.channels.cache.find(c => c.name === 'rules' && c.type === ChannelType.GuildText);
  if (rules) await guild.setRulesChannel(rules, 'Node Hub official rules channel').catch(() => {});
  const announcements = guild.channels.cache.find(c => c.name === 'announcements' && c.type === ChannelType.GuildAnnouncement);
  if (announcements) await guild.setPublicUpdatesChannel(announcements, 'Node Hub community announcements').catch(() => {});

  const me = guild.members.me;
  const mod = roles.get('Moderator');
  if (me && mod && me.roles.highest.position <= mod.position) {
    console.warn('NODE_HUB_ROLE_WARNING: move the bot integration role above Moderator in Discord so it can moderate members below it. Founder and Administrator remain protected.');
  }

  console.log(`NODE_HUB_STRUCTURE_SYNC_OK: final Discord structure synchronized for ${guild.name}`);
}

const originalLogin = Client.prototype.login;
Client.prototype.login = function patchedLogin(token) {
  if (!this.__nodeHubForceStructure) {
    this.__nodeHubForceStructure = true;
    this.once('ready', () => {
      for (const guild of this.guilds.cache.values()) sync(guild).catch(error => console.error('NODE_HUB_STRUCTURE_SYNC_ERROR:', error));
    });
  }
  return originalLogin.call(this, token);
};
