require('dotenv').config();
const { Client, GatewayIntentBits, ChannelType } = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const GUILD_ID = process.env.DISCORD_GUILD_ID;

if (!TOKEN || !GUILD_ID) {
  console.log('NODE_HUB_STRUCTURE_SYNC_SKIPPED: DISCORD_TOKEN or DISCORD_GUILD_ID is missing.');
  process.exit(0);
}

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const STRUCTURE = [
  { category: '📌 START HERE', channels: [
    { name: 'welcome', mode: 'readonly' },
    { name: 'rules', mode: 'readonly' },
    { name: 'announcements', mode: 'announcement' },
    { name: 'donate', mode: 'readonly' },
  ]},
  { category: '🌐 COMMUNITY', channels: [
    { name: 'general', mode: 'open' },
    { name: 'treasure-hunt', mode: 'open' },
    { name: 'events', mode: 'readonly' },
    { name: 'community-promo', mode: 'open' },
  ]},
  { category: '🌎 UPLAND', channels: [
    { name: 'upland-guide', mode: 'readonly' },
    { name: 'treasure-results', mode: 'readonly' },
    { name: 'daily-ranking', mode: 'readonly' },
    { name: 'player-stats', mode: 'readonly' },
    { name: 'bsts-properties', mode: 'open' },
    { name: 'bsts-assets', mode: 'open' },
    { name: 'sold', mode: 'open' },
    { name: 'listing-alerts', mode: 'readonly' },
    { name: 'upland-alerts', mode: 'readonly' },
  ]},
  { category: '🤖 NODE HUB', channels: [
    { name: 'getting-started', mode: 'readonly' },
    { name: 'leaderboard', mode: 'readonly' },
  ]},
  { category: '🔊 VOICE', channels: [
    { name: 'Upland', mode: 'voice' },
    { name: 'Launches', mode: 'voice' },
    { name: 'Node Hub', mode: 'voice' },
    { name: 'General', mode: 'voice' },
  ]},
  { category: '🆘 SUPPORT', channels: [
    { name: 'open-ticket', mode: 'readonly' },
  ]},
  { category: '🟧 TEAM', channels: [
    { name: 'support-tickets', mode: 'team' },
    { name: 'team-chat', mode: 'team' },
    { name: 'tasks', mode: 'team' },
    { name: 'development', mode: 'team' },
    { name: 'internal-bugs', mode: 'team' },
    { name: 'node-status', mode: 'team' },
    { name: 'event-log', mode: 'team' },
  ]},
];

const OLD_CATEGORIES = new Set(['📊 UPLAND DATA', '💰 SUPPORT NODE HUB']);
const OLD_CHANNELS = new Set([
  'suggestions', 'partnerships', 'support', 'upland', 'upland-wins', 'upland-discussion', 'new-listings',
]);

function slug(name) {
  return name.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

async function getCategory(guild, name) {
  let category = guild.channels.cache.find(c => c.type === ChannelType.GuildCategory && c.name === name);
  if (!category) category = await guild.channels.create({ name, type: ChannelType.GuildCategory, reason: 'Node Hub final Discord structure' });
  return category;
}

async function getTextChannel(guild, name, parent, announcement = false) {
  const channelName = slug(name);
  let channel = guild.channels.cache.find(c => (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement) && c.name === channelName);
  if (!channel) {
    channel = await guild.channels.create({
      name: channelName,
      type: announcement ? ChannelType.GuildAnnouncement : ChannelType.GuildText,
      parent: parent.id,
      reason: 'Node Hub final Discord structure',
    });
  } else {
    if (channel.parentId !== parent.id) await channel.setParent(parent.id, { lockPermissions: false });
    if (announcement && channel.type === ChannelType.GuildText && typeof channel.setType === 'function') {
      await channel.setType(ChannelType.GuildAnnouncement, 'Node Hub announcements channel').catch(() => {});
    }
  }
  return channel;
}

async function getVoiceChannel(guild, name, parent) {
  const channelName = slug(name);
  let channel = guild.channels.cache.find(c => c.type === ChannelType.GuildVoice && c.name === channelName);
  if (!channel) channel = await guild.channels.create({ name: channelName, type: ChannelType.GuildVoice, parent: parent.id, reason: 'Node Hub voice structure' });
  else if (channel.parentId !== parent.id) await channel.setParent(parent.id, { lockPermissions: false });
  return channel;
}

async function applyPermissions(channel, mode, guild) {
  if (mode === 'voice') return;
  if (mode === 'open') {
    await channel.permissionOverwrites.edit(guild.roles.everyone, {
      ViewChannel: true,
      SendMessages: true,
      AddReactions: true,
    });
    return;
  }
  if (mode === 'team') return;
  await channel.permissionOverwrites.edit(guild.roles.everyone, {
    ViewChannel: true,
    SendMessages: false,
    AddReactions: false,
    CreatePublicThreads: false,
    CreatePrivateThreads: false,
  });
}

async function sync(guild) {
  const desiredChannelNames = new Set(STRUCTURE.flatMap(section => section.channels.map(c => slug(c.name))));

  for (const channel of [...guild.channels.cache.values()]) {
    if (channel.type === ChannelType.GuildCategory && OLD_CATEGORIES.has(channel.name)) {
      await channel.delete('Remove obsolete Node Hub category').catch(() => {});
      continue;
    }
    if ((channel.type === ChannelType.GuildText || channel.type === ChannelType.GuildAnnouncement) && OLD_CHANNELS.has(channel.name) && !desiredChannelNames.has(channel.name)) {
      await channel.delete('Remove obsolete Node Hub channel').catch(() => {});
    }
  }

  for (const section of STRUCTURE) {
    const parent = await getCategory(guild, section.category);
    for (const item of section.channels) {
      const channel = item.mode === 'voice'
        ? await getVoiceChannel(guild, item.name, parent)
        : await getTextChannel(guild, item.name, parent, item.mode === 'announcement');
      await applyPermissions(channel, item.mode, guild);
    }
  }

  const rules = guild.channels.cache.find(c => c.name === 'rules' && (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement));
  if (rules && typeof guild.setRulesChannel === 'function') await guild.setRulesChannel(rules, 'Node Hub official rules channel').catch(() => {});

  const announcements = guild.channels.cache.find(c => c.name === 'announcements' && c.type === ChannelType.GuildAnnouncement);
  if (announcements && typeof guild.setPublicUpdatesChannel === 'function') await guild.setPublicUpdatesChannel(announcements, 'Node Hub community announcements').catch(() => {});

  console.log(`NODE_HUB_STRUCTURE_SYNC_OK: final Discord structure synchronized for ${guild.name}`);
}

client.once('ready', async () => {
  try {
    const guild = await client.guilds.fetch(GUILD_ID);
    await sync(guild);
  } catch (error) {
    console.error('NODE_HUB_STRUCTURE_SYNC_FAILED:', error);
    process.exitCode = 1;
  } finally {
    await client.destroy();
  }
});

client.login(TOKEN).catch(error => {
  console.error('NODE_HUB_STRUCTURE_SYNC_LOGIN_FAILED:', error);
  process.exitCode = 1;
});
