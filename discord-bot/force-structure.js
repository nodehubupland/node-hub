const { Client, ChannelType } = require('discord.js');

// Safety mode: audit the existing server without changing its structure.
async function auditGuild(guild) {
  await guild.channels.fetch();
  await guild.roles.fetch();

  const categories = [...guild.channels.cache.values()]
    .filter(c => c.type === ChannelType.GuildCategory)
    .sort((a, b) => a.position - b.position);

  const categoryIds = new Set(categories.map(c => c.id));
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

  const result = {
    guild: guild.name,
    guildId: guild.id,
    memberCount: guild.memberCount,
    roles: [...guild.roles.cache.values()]
      .filter(r => r.name !== '@everyone')
      .sort((a, b) => b.position - a.position)
      .map(r => r.name),
    categories: categories.map(category => ({
      name: category.name,
      position: category.position,
      channels: channels
        .filter(c => c.parentId === category.id)
        .map(c => ({
          name: c.name,
          type: typeName(c.type),
          position: c.position,
          topic: c.topic || null,
        })),
    })),
    uncategorized: channels
      .filter(c => !c.parentId || !categoryIds.has(c.parentId))
      .map(c => ({ name: c.name, type: typeName(c.type), position: c.position })),
  };

  // Keep the report on one log line so Render does not paginate the JSON itself.
  console.log('NODE_HUB_SERVER_AUDIT_JSON=' + JSON.stringify(result));
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
