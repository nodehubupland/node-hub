// Discord structure is frozen for New Box Games.
// This module must never create, move, rename, delete or permission-edit channels/roles.
const { Client, ChannelType } = require('discord.js');
const { setupUplandData } = require('./upland-data');

async function auditGuild(guild) {
  await guild.channels.fetch();
  await guild.roles.fetch();
  const categories = [...guild.channels.cache.values()]
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);
  const channels = [...guild.channels.cache.values()]
    .filter(c => c.type !== ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);
  const typeName = type => ({
    [ChannelType.GuildText]: 'text',
    [ChannelType.GuildAnnouncement]: 'announcement',
    [ChannelType.GuildVoice]: 'voice',
    [ChannelType.GuildStageVoice]: 'stage',
    [ChannelType.GuildForum]: 'forum',
    [ChannelType.GuildMedia]: 'media',
  }[type] || String(type));
  console.log('NODE_HUB_SERVER_AUDIT_JSON=' + JSON.stringify({
    guild: guild.name,
    guildId: guild.id,
    memberCount: guild.memberCount,
    roles: [...guild.roles.cache.values()]
      .filter(r => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => r.name),
    categories: categories.map(c => ({
      name: c.name,
      position: c.position,
      channels: channels
        .filter(x => x.parentId === c.id)
        .map(x => ({ name: x.name, type: typeName(x.type), position: x.position }))
    })),
    uncategorized: channels
      .filter(c => !c.parentId)
      .map(c => ({ name: c.name, type: typeName(c.type), position: c.position }))
  }));
}

const originalLogin = Client.prototype.login;
Client.prototype.login = function frozenStructureLogin(token) {
  if (!this.__nodeHubFrozenStructure) {
    this.__nodeHubFrozenStructure = true;
    try {
      require('./xp-system').setup(this);
    } catch (error) {
      console.error('NODE_HUB_XP_INIT_ERROR:', error);
    }
    setupUplandData(this);
    this.once('ready', async () => {
      console.log('NODE_HUB_STRUCTURE_FROZEN: no channel/category/role synchronization will run.');
      for (const guild of this.guilds.cache.values()) {
        try {
          await auditGuild(guild);
        } catch (error) {
          console.error(`NODE_HUB_SERVER_AUDIT_ERROR:${guild.id}:`, error);
        }
      }
    });
  }
  return originalLogin.call(this, token);
};