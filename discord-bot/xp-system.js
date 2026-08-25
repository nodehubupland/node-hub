const { PermissionFlagsBits, ChannelType, EmbedBuilder } = require('discord.js');

const records = new Map();
const messageCooldown = new Map();
const voiceTimers = new Map();

const MESSAGE_XP = 5;
const MESSAGE_COOLDOWN = 60_000;
const VOICE_XP = 2;
const VOICE_INTERVAL = 5 * 60_000;

const ROLE_THRESHOLDS = [
  { level: 5, role: 'Member' },
  { level: 10, role: 'Active' },
  { level: 20, role: 'Contrib' },
  { level: 30, role: 'Elite' },
  { level: 50, role: 'Legend' },
];

function key(guildId, userId) {
  return `${guildId}:${userId}`;
}

function getRecord(guildId, userId) {
  const id = key(guildId, userId);
  if (!records.has(id)) records.set(id, { guildId, userId, xp: 0 });
  return records.get(id);
}

function levelFromXp(xp) {
  let level = 0;
  for (let levelCandidate = 1; levelCandidate <= 100; levelCandidate += 1) {
    if (xp >= 100 * levelCandidate * levelCandidate) level = levelCandidate;
    else break;
  }
  return level;
}

function xpForLevel(level) {
  return 100 * level * level;
}

function getRank(guildId, userId) {
  const ranked = [...records.values()]
    .filter(record => record.guildId === guildId)
    .sort((a, b) => b.xp - a.xp);
  const index = ranked.findIndex(record => record.userId === userId);
  return index < 0 ? ranked.length + 1 : index + 1;
}

function isProtected(member) {
  return member.id === member.guild.ownerId || member.permissions.has(PermissionFlagsBits.Administrator) || member.roles.cache.some(role => ['Founder', 'Administrator'].includes(role.name));
}

async function promote(member, oldLevel, newLevel) {
  for (const threshold of ROLE_THRESHOLDS) {
    if (threshold.level <= oldLevel || threshold.level > newLevel) continue;
    const role = member.guild.roles.cache.find(candidate => candidate.name === threshold.role);
    const botMember = member.guild.members.me;
    if (role && botMember && role.position < botMember.roles.highest.position) {
      await member.roles.add(role, `Node Hub XP promotion to level ${threshold.level}`).catch(() => {});
    }

    const leaderboard = member.guild.channels.cache.find(channel => channel.name === 'leaderboard' && channel.type === ChannelType.GuildText);
    if (leaderboard) {
      const embed = new EmbedBuilder()
        .setTitle('Promotion / Promoção')
        .setDescription(`Congratulations ${member}!\n\n**English:** You reached **Level ${threshold.level}** and earned **${threshold.role}**.\n**Português:** Você alcançou o **Nível ${threshold.level}** e recebeu **${threshold.role}**.`)
        .setColor(role?.color || 0xF1C40F)
        .setTimestamp();
      await leaderboard.send({ embeds: [embed] }).catch(() => {});
    }
  }
}

async function addXp(member, amount) {
  if (!member || member.user.bot || isProtected(member)) return;
  const record = getRecord(member.guild.id, member.id);
  const oldLevel = levelFromXp(record.xp);
  record.xp += amount;
  const newLevel = levelFromXp(record.xp);
  if (newLevel > oldLevel) await promote(member, oldLevel, newLevel);
}

function rankMessage(guild, member) {
  const record = getRecord(guild.id, member.id);
  const level = levelFromXp(record.xp);
  const currentLevelXp = xpForLevel(level);
  const nextLevelXp = xpForLevel(level + 1);
  const progress = Math.min(100, Math.max(0, Math.round(((record.xp - currentLevelXp) / Math.max(1, nextLevelXp - currentLevelXp)) * 100)));
  const role = [...ROLE_THRESHOLDS].reverse().find(item => level >= item.level)?.role || 'Member';
  return `**${member.displayName}**\n\nLevel: **${level}**\nXP: **${record.xp.toLocaleString()}**\nRank: **#${getRank(guild.id, member.id)}**\nRole: **${role}**\nProgress: **${progress}%** toward Level ${level + 1}`;
}

async function updateLeaderboard(guild) {
  const channel = guild.channels.cache.find(item => item.name === 'leaderboard' && item.type === ChannelType.GuildText);
  if (!channel) return;
  const ranked = [...records.values()].filter(record => record.guildId === guild.id).sort((a, b) => b.xp - a.xp).slice(0, 20);
  const lines = ranked.length
    ? ranked.map((record, index) => `${index + 1}. <@${record.userId}> · Level ${levelFromXp(record.xp)} · ${record.xp.toLocaleString()} XP`).join('\n')
    : 'No activity recorded yet. / Nenhuma atividade registrada ainda.';
  const recent = await channel.messages.fetch({ limit: 10 }).catch(() => null);
  const existing = recent?.find(message => message.author.id === guild.client.user.id && message.embeds.some(embed => embed.title === 'Node Hub Leaderboard'));
  const embed = new EmbedBuilder().setTitle('Node Hub Leaderboard').setDescription(lines).setColor(0x5865F2).setFooter({ text: 'Discord activity ranking • XP progression is intentionally slow' }).setTimestamp();
  if (existing) await existing.edit({ embeds: [embed] }).catch(() => {});
  else await channel.send({ embeds: [embed] }).catch(() => {});
}

function setup(client) {
  client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    if (message.channel.name === 'leaderboard') return;
    const now = Date.now();
    const last = messageCooldown.get(key(message.guild.id, message.author.id)) || 0;
    if (now - last < MESSAGE_COOLDOWN) return;
    messageCooldown.set(key(message.guild.id, message.author.id), now);
    await addXp(message.member, MESSAGE_XP);
  });

  client.on('voiceStateUpdate', (oldState, newState) => {
    const member = newState.member || oldState.member;
    if (!member || member.user.bot) return;
    const id = key(member.guild.id, member.id);
    if (newState.channelId && !voiceTimers.has(id)) {
      const timer = setInterval(async () => {
        const current = member.guild.members.cache.get(member.id);
        const channel = current?.voice?.channel;
        if (!channel || channel.members.filter(user => !user.user.bot).size < 2) return;
        await addXp(current, VOICE_XP);
      }, VOICE_INTERVAL);
      voiceTimers.set(id, timer);
    }
    if (!newState.channelId) {
      const timer = voiceTimers.get(id);
      if (timer) clearInterval(timer);
      voiceTimers.delete(id);
    }
  });

  client.on('interactionCreate', async interaction => {
    if (!interaction.isChatInputCommand()) return;
    if (interaction.commandName === 'rank' || interaction.commandName === 'points') {
      await interaction.reply({ content: rankMessage(interaction.guild, interaction.member), ephemeral: true });
    }
    if (interaction.commandName === 'leaderboard') {
      await updateLeaderboard(interaction.guild);
      await interaction.reply({ content: 'Leaderboard updated in #leaderboard.', ephemeral: true });
    }
  });

  client.once('ready', async () => {
    for (const guild of client.guilds.cache.values()) {
      await guild.commands.create({ name: 'rank', description: 'Show your Node Hub Discord rank.' }).catch(() => {});
      await guild.commands.create({ name: 'points', description: 'Show your Node Hub Discord XP and rank.' }).catch(() => {});
      await guild.commands.create({ name: 'leaderboard', description: 'Show the Node Hub Discord leaderboard.' }).catch(() => {});
      await updateLeaderboard(guild);
    }
  });
}

module.exports = { setup };
