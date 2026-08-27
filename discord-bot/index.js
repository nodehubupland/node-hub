require('dotenv').config();
require('./force-structure');

const express = require('express');
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  EmbedBuilder,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const discordEnabled = Boolean(TOKEN && process.env.DISCORD_CLIENT_ID);

const client = discordEnabled ? new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
}) : null;

function slug(name) {
  return String(name || '').toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function findChannel(guild, name) {
  const wanted = slug(name);
  return guild.channels.cache.find(c =>
    (c.type === ChannelType.GuildText || c.type === ChannelType.GuildAnnouncement || c.type === ChannelType.GuildVoice) &&
    c.name === wanted
  );
}

const spamTracker = new Map();
const SPAM_LIMIT = 6;
const SPAM_WINDOW_MS = 8000;

if (discordEnabled) {
  client.once('ready', () => {
    console.log(`Node Hub Discord Bot online as ${client.user.tag}`);
    console.log('DISCORD_STRUCTURE_LOCKED: no channel, category, role, permission, or member-role synchronization is enabled in index.js.');
  });

  client.on('messageCreate', async message => {
    if (!message.guild || message.author.bot) return;
    const now = Date.now();
    const active = (spamTracker.get(message.author.id) || []).filter(t => now - t < SPAM_WINDOW_MS);
    active.push(now);
    spamTracker.set(message.author.id, active);

    if (active.length >= SPAM_LIMIT) {
      spamTracker.set(message.author.id, []);
      const member = message.member;
      const protectedMember = member?.id === message.guild.ownerId || member?.permissions.has(PermissionFlagsBits.Administrator);
      const me = message.guild.members.me;
      if (!protectedMember && member?.moderatable && me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
        await member.timeout(60000, 'Node Hub anti-spam').catch(() => {});
      }
    }
  });

  client.on('error', error => {
    console.error('DISCORD_CLIENT_ERROR:', error.message);
  });

  client.on('warn', warning => {
    console.warn('DISCORD_CLIENT_WARNING:', warning);
  });

  client.login(TOKEN).catch(error => console.error('Discord login failed:', error));
}

const server = express();
server.use(express.json({ limit: '1mb' }));
server.use(express.static(require('path').join(__dirname, '..')));
server.get('/', (_req, res) => res.sendFile(require('path').join(__dirname, '..', 'index.html')));
server.get('/health', (_req, res) => res.status(200).json({ status: 'ok', service: 'Node Hub' }));
server.get('/webhook', (_req, res) => res.redirect(302, '/'));
server.post('/webhook', (req, res) => {
  console.log('Upland webhook received:', JSON.stringify(req.body || {}));
  res.status(200).json({ status: 'ok' });
});
server.use((_req, res) => res.status(404).json({ status: 404, message: 'Not Found' }));
const PORT = Number(process.env.PORT || 10000);
server.listen(PORT, '0.0.0.0', () => console.log(`Node Hub webhook server listening on port ${PORT}`));
