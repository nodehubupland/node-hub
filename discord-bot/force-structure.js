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

const TEAM = new Set(['Founder', 'Administrator', 'Moderator', 'Developer']);
const BOT_ONLY = new Set(['rules', 'announcements', 'donate', 'upland-guide', 'treasure-results', 'daily-ranking', 'player-stats', 'listing-alerts', 'upland-alerts', 'getting-started', 'leaderboard', 'open-ticket']);
const OPEN = new Set(['general', 'treasure-hunt', 'community-promo', 'bsts-properties', 'bsts-assets', 'sold']);
const OLD_CATEGORIES = new Set(['📊 UPLAND DATA', '💰 SUPPORT NODE HUB']);
const OLD_CHANNELS = new Set(['suggestions', 'partnerships', 'upland', 'upland-wins', 'upland-discussion', 'new-listings', 'support']);

const slug = value => value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');

async function sync(guild) {
  await guild.channels.fetch();
  await guild.roles.fetch();

  const roles = new Map(guild.roles.cache.map(r => [r.name, r]));
  const teamRoles = [...TEAM].map(name => roles.get(name)).filter(Boolean);

  const categories = new Map();
  for (const name of Object.keys(FINAL)) {
    let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === name);
    if (!category) category = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'Node Hub final server structure' });
    categories.set(name, category);
    if (name === '🟧 TEAM') {
      await category.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false });
      for (const role of teamRoles) await category.permissionOverwrites.edit(role, { ViewChannel: true });
    }
  }

  const wantedText = new Set();
  const wantedVoice = new Set();
  for (const [categoryName, channelNames] of Object.entries(FINAL)) {
    const parent = categories.get(categoryName);
    for (const name of channelNames) {
      const channelName = slug(name);
      const voice = categoryName === '🔊 VOICE';
      (voice ? wantedVoice : wantedText).add(channelName);
      let channel = guild.channels.cache.find(c => c.name === channelName && (voice ? c.type === ChannelType.GuildVoice : (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement)));
      if (!channel) {
        channel = await guild.channels.create({ name: channelName, type: voice ? ChannelType.GuildVoice : (name === 'announcements' ? ChannelType.GuildAnnouncement : ChannelType.GuildText), parent: parent.id, reason: 'Node Hub final server structure' });
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
          await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: true, SendMessages: false, AddReactions: false });
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

  console.log('NODE_HUB_STRUCTURE_SYNC_OK: final Discord structure synchronized.');
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
