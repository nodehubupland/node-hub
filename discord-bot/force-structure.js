const { Client, ChannelType } = require('discord.js');

// Safety mode: structure synchronization is intentionally disabled while we inspect
// the existing New Box Games server. Nothing is created, moved, edited or deleted.
async function auditGuild(guild) {
  await guild.channels.fetch();
  await guild.roles.fetch();

  const categories = [...guild.channels.cache.values()]
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  const categoryIds = new Set(categories.map(c => c.id));
  const uncategorized = [...guild.channels.cache.values()]
    .filter(c => !c.parentId && !categoryIds.has(c.id))
    .sort((a, b) => a.position - b.position);

  const result = {
    guild: guild.name,
    guildId: guild.id,
    memberCount: guild.memberCount,
    roles: [...guild.roles.cache.values()]
      .filter(r => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => ({ name: r.name, position: r.position, managed: r.managed })),
    categories: categories.map(category => ({
      name: category.name,
      id: category.id,
      position: category.position,
      channels: [...guild.channels.cache.values()]
        .filter(c => c.parentId === category.id)
        .sort((a, b) => a.position - b.position)
        .map(c => ({
          name: c.name,
          id: c.id,
          type: c.type,
          position: c.position,
          topic: c.topic || null,
          nsfw: Boolean(c.nsfw),
        })),
    })),
    uncategorized: uncategorized.map(c => ({
      name: c.name,
      id: c.id,
      type: c.type,
      position: c.position,
    })),
  };

  console.log('NODE_HUB_SERVER_AUDIT_BEGIN');
  console.log(JSON.stringify(result, null, 2));
  console.log('NODE_HUB_SERVER_AUDIT_END');
}

const originalLogin = Client.prototype.login;
Client.prototype.login = function safeLogin(token) {
  if (!this.__nodeHubSafetyMode) {
    this.__nodeHubSafetyMode = true;

    try {
      require('./xp-system').setup(this);
    } catch (error) {
      console.error('NODE_HUB_XP_INIT_ERROR:', error);
    }

    this.once('ready', async () => {
      console.log('NODE_HUB_STRUCTURE_SYNC_DISABLED: read-only audit mode active.');
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
