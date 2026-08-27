// Discord structure and role assignments are frozen for New Box Games.
// This module must never create, move, rename, delete, or permission-edit channels/roles.
const {
  Client,
  ChannelType,
  GuildMemberRoleManager,
  RoleManager,
  GuildChannelManager,
  GuildChannel,
  Role,
} = require('discord.js');
const { setupUplandData } = require('./upland-data');

function frozen(label) {
  return async function frozenMutation() {
    console.log(`NODE_HUB_STRUCTURE_MUTATION_BLOCKED:${label}`);
    return this;
  };
}

// Hard safety guard: this bot instance cannot add/remove roles or mutate the role list.
if (!GuildMemberRoleManager.prototype.__nodeHubRolesFrozen) {
  GuildMemberRoleManager.prototype.__nodeHubRolesFrozen = true;
  GuildMemberRoleManager.prototype.add = frozen('member-role-add');
  GuildMemberRoleManager.prototype.remove = frozen('member-role-remove');
  GuildMemberRoleManager.prototype.set = frozen('member-role-set');
}

if (RoleManager?.prototype && !RoleManager.prototype.__nodeHubRoleManagerFrozen) {
  RoleManager.prototype.__nodeHubRoleManagerFrozen = true;
  RoleManager.prototype.create = frozen('role-create');
  RoleManager.prototype.delete = frozen('role-delete');
  RoleManager.prototype.edit = frozen('role-edit');
}

// Hard safety guard: no channel/category creation, deletion, moving or renaming.
if (GuildChannelManager?.prototype && !GuildChannelManager.prototype.__nodeHubChannelManagerFrozen) {
  GuildChannelManager.prototype.__nodeHubChannelManagerFrozen = true;
  GuildChannelManager.prototype.create = frozen('channel-create');
  GuildChannelManager.prototype.delete = frozen('channel-delete');
}

if (GuildChannel?.prototype && !GuildChannel.prototype.__nodeHubChannelFrozen) {
  GuildChannel.prototype.__nodeHubChannelFrozen = true;
  GuildChannel.prototype.setName = frozen('channel-rename');
  GuildChannel.prototype.setParent = frozen('channel-move');
  GuildChannel.prototype.delete = frozen('channel-delete');
}

if (Role?.prototype && !Role.prototype.__nodeHubRoleFrozen) {
  Role.prototype.__nodeHubRoleFrozen = true;
  Role.prototype.setName = frozen('role-rename');
  Role.prototype.edit = frozen('role-edit');
  Role.prototype.delete = frozen('role-delete');
}

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