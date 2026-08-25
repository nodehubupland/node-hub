const { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require('discord.js');

const PREFERENCE_ROLES = [
  { key: 'listings', name: 'Upland Listings', label: 'Upland Listings', emoji: '🏠', description: 'New property listing alerts.' },
  { key: 'treasure', name: 'Treasure Hunt', label: 'Treasure Hunt', emoji: '🏆', description: 'Treasure Hunt alerts and results.' },
  { key: 'news', name: 'Upland News', label: 'Upland News', emoji: '📰', description: 'Upland news and official updates.' },
  { key: 'content', name: 'Node Hub Content', label: 'Node Hub Content', emoji: '📺', description: 'Node Hub videos and new content.' },
  { key: 'community', name: 'Community', label: 'Community', emoji: '🌎', description: 'Important community announcements.' },
];

function preferenceComponents() {
  return [
    new ActionRowBuilder().addComponents(
      ...PREFERENCE_ROLES.slice(0, 3).map(role => new ButtonBuilder().setCustomId(`pref:${role.key}`).setLabel(role.label).setEmoji(role.emoji).setStyle(ButtonStyle.Secondary)),
    ),
    new ActionRowBuilder().addComponents(
      ...PREFERENCE_ROLES.slice(3).map(role => new ButtonBuilder().setCustomId(`pref:${role.key}`).setLabel(role.label).setEmoji(role.emoji).setStyle(ButtonStyle.Secondary)),
    ),
  ];
}

function preferenceEmbed() {
  return new EmbedBuilder()
    .setTitle('Choose your Node Hub notifications')
    .setDescription('**English**\nChoose the notifications you want to receive. Click a button again to remove the role.\n\n**Português**\nEscolha as notificações que deseja receber. Clique novamente para remover o cargo.')
    .addFields(PREFERENCE_ROLES.map(role => ({ name: `${role.emoji} ${role.label}`, value: role.description, inline: true })))
    .setColor(0x5865F2)
    .setFooter({ text: 'Node Hub • You can change your preferences at any time' });
}

async function handlePreferenceInteraction(interaction) {
  if (!interaction.isButton() || !interaction.customId.startsWith('pref:')) return false;
  const key = interaction.customId.slice(5);
  const definition = PREFERENCE_ROLES.find(role => role.key === key);
  if (!definition) return false;
  const role = interaction.guild.roles.cache.find(r => r.name === definition.name);
  if (!role) return interaction.reply({ content: 'This notification role is not configured yet.', ephemeral: true });
  if (interaction.member.roles.cache.has(role.id)) {
    await interaction.member.roles.remove(role);
    await interaction.reply({ content: `Removed **${definition.label}** notifications.`, ephemeral: true });
  } else {
    await interaction.member.roles.add(role);
    await interaction.reply({ content: `Enabled **${definition.label}** notifications.`, ephemeral: true });
  }
  return true;
}

async function postPreferencePanel(channel) {
  return channel.send({ embeds: [preferenceEmbed()], components: preferenceComponents() });
}

module.exports = { PREFERENCE_ROLES, handlePreferenceInteraction, postPreferencePanel, preferenceEmbed, preferenceComponents };
