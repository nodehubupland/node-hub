const { ChannelType } = require('discord.js');

const APPROVED_CATEGORIES = new Set([
  '📌 START HERE', '📻 RADIO BOX', '🌎 COMMUNITY', '🦙 UPLAND',
  '📊 UPLAND DATA', '🤖 NODE HUB', '🎮 GAMES', '🆘 SUPPORT', '🔒 TEAM', '🗄️ FILES',
]);

const APPROVED_CHANNELS = new Set([
  'welcome','rules','announcements','information','donate','radio-cafe-chat','upland-01','upland-02',
  'baguncinha-de-jogos-01','baguncinha-de-jogos-02','general','spawn-de-memes','giveaways','level-up',
  'community-promo','events','invite','upland-chat','upland-announcements','upland-guide','nodes-newbox',
  'treasure-hunt','data-guide','treasure-results','daily-ranking','player-stats','listing-alerts',
  'getting-started','leaderboard','node-status','games-chat','gta','videos-lives','gaming-news','support',
  'open-ticket','team-chat','tasks','development','internal-bugs','event-log','support-tickets',
]);

const normalize = value => String(value || '').toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '').replace(/[^a-z0-9]/g, '');
const categoryIsApproved = name => [...APPROVED_CATEGORIES].some(x => normalize(x) === normalize(name));
const channelIsApproved = name => APPROVED_CHANNELS.has(normalize(name));

async function ensureFilesCategory(guild) {
  let files = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && normalize(c.name) === 'files');
  if (!files) files = await guild.channels.create({ name: '🗄️ FILES', type: ChannelType.GuildCategory, reason: 'Archive legacy New Box Games channels' });
  await files.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(() => {});
  if (guild.ownerId) await files.permissionOverwrites.edit(guild.ownerId, { ViewChannel: true, ReadMessageHistory: true, SendMessages: true, ManageChannels: true }).catch(() => {});
  return files;
}

async function lockArchivedChannel(channel, guild) {
  const ownerId = guild.ownerId;
  const overwrites = [
    { id: guild.roles.everyone.id, deny: ['ViewChannel', 'SendMessages', 'AddReactions'] },
  ];
  if (ownerId) overwrites.push({ id: ownerId, allow: ['ViewChannel', 'ReadMessageHistory', 'SendMessages', 'ManageChannels'] });
  await channel.permissionOverwrites.set(overwrites, 'Archive legacy channel for New Box Games').catch(() => {});
}

async function archiveLegacyChannels(guild) {
  await guild.channels.fetch();
  const files = await ensureFilesCategory(guild);
  let archived = 0;

  for (const channel of [...guild.channels.cache.values()]) {
    if (channel.id === files.id) continue;
    if (channel.type === ChannelType.GuildCategory) {
      if (categoryIsApproved(channel.name)) continue;
      const children = guild.channels.cache.filter(c => c.parentId === channel.id);
      if (children.size === 0) {
        await channel.permissionOverwrites.edit(guild.roles.everyone, { ViewChannel: false }).catch(() => {});
      }
      continue;
    }
    if (channelIsApproved(channel.name)) continue;
    if (channel.parentId === files.id) {
      await lockArchivedChannel(channel, guild);
      continue;
    }
    await channel.setParent(files.id, { lockPermissions: false, reason: 'Archive legacy New Box Games channel' }).catch(() => {});
    await lockArchivedChannel(channel, guild);
    archived++;
  }

  console.log(`NODE_HUB_LEGACY_ARCHIVE_OK:${guild.id}:${guild.name}:archived=${archived}`);
  return archived;
}

module.exports = { archiveLegacyChannels };
