require('dotenv').config();

const { execFile } = require('child_process');
const path = require('path');

if (process.env.DISCORD_TOKEN && process.env.DISCORD_CLIENT_ID && process.env.DISCORD_GUILD_ID && process.env.NODE_HUB_SKIP_STRUCTURE_SYNC !== 'true') {
  console.log('NODE_HUB_STRUCTURE_SYNC_START: synchronizing Discord structure in background...');
  execFile(process.execPath, [path.join(__dirname, 'sync-discord-structure.js')], { stdio: 'inherit', env: process.env }, (error) => {
    if (error) console.error('NODE_HUB_STRUCTURE_SYNC_FAILED:', error.message);
    else console.log('NODE_HUB_STRUCTURE_SYNC_COMPLETE: Discord structure synchronization finished.');
  });
}

const express = require('express');
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  ChannelType,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const GUILD_ID = process.env.DISCORD_GUILD_ID;
const discordEnabled = Boolean(TOKEN && CLIENT_ID);

if (!discordEnabled) console.warn('Discord bot credentials are not configured. Starting webhook server only.');

const client = discordEnabled ? new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
  ],
}) : null;
