const ROLE_DEFINITIONS = [
  { name: 'Founder', color: 0xF5A623, protected: true },
  { name: 'Administrator', color: 0xE74C3C, protected: true },
  { name: 'Bot', color: 0x5865F2, protected: true },
  { name: 'Moderator', color: 0x2ECC71 },
  { name: 'Developer', color: 0x3498DB },
  { name: 'Partner', color: 0x1ABC9C },
  { name: 'Legend', color: 0xF1C40F },
  { name: 'Elite', color: 0xE67E22 },
  { name: 'Contrib', color: 0x9B59B6 },
  { name: 'Active', color: 0x2ECC71 },
  { name: 'Member', color: 0x7F8C8D },
  { name: 'Uplander', color: 0x95A5A6 },
  { name: 'Verified', color: 0xF1C40F },
  { name: 'Upland Listings', color: 0x3498DB, notification: true },
  { name: 'Treasure Hunt', color: 0xF1C40F, notification: true },
  { name: 'Upland News', color: 0xE74C3C, notification: true },
  { name: 'Node Hub Content', color: 0x9B59B6, notification: true },
  { name: 'Community', color: 0x1ABC9C, notification: true },
];

const PROTECTED_ROLES = new Set(['Founder', 'Administrator']);
const MODERATION_EXEMPT_ROLES = new Set(['Founder', 'Administrator']);

const PUBLIC_STRUCTURE = [
  { name: '📌 START HERE', channels: ['welcome', 'rules', 'announcements'] },
  { name: '🌐 COMMUNITY', channels: ['general', 'suggestions', 'community-promo', 'partnerships', 'events'] },
  { name: '🌎 UPLAND', channels: ['upland', 'treasure-hunt', 'upland-wins', 'upland-discussion'] },
  { name: '🤖 NODE HUB', channels: ['getting-started', 'support', 'leaderboard', 'player-stats'] },
  { name: '📊 UPLAND DATA', channels: ['bsts-assets', 'bsts-properties', 'new-listings', 'listing-alerts', 'treasure-results', 'upland-alerts'] },
  { name: '🔊 VOICE', voiceChannels: ['Upland', 'Launches', 'Node Hub', 'General'] },
  { name: '💰 SUPPORT NODE HUB', channels: ['donate'] },
];

const BOT_ONLY_CHANNELS = new Set([
  'rules', 'announcements', 'getting-started', 'leaderboard', 'player-stats',
  'new-listings', 'listing-alerts', 'treasure-results', 'upland-alerts', 'node-status', 'event-log',
]);

const MANUAL_LISTING_CHANNELS = new Set(['bsts-assets', 'bsts-properties']);

const TEAM_STRUCTURE = ['team-chat', 'tasks', 'development', 'internal-bugs', 'node-status', 'event-log'];
const TEAM_ROLES = new Set(['Founder', 'Administrator', 'Bot', 'Moderator', 'Developer']);

const NOTIFICATION_ROLES = {
  'Upland Listings': 'Receive new Upland property listing notifications.',
  'Treasure Hunt': 'Receive Treasure Hunt notifications and results.',
  'Upland News': 'Receive Upland news and official updates.',
  'Node Hub Content': 'Receive Node Hub video and content notifications.',
  'Community': 'Receive important community notifications.',
};

const LEVELS = [
  { level: 5, role: 'Member' },
  { level: 15, role: 'Active' },
  { level: 30, role: 'Contrib' },
  { level: 50, role: 'Elite' },
  { level: 100, role: 'Legend' },
];

module.exports = {
  ROLE_DEFINITIONS,
  PROTECTED_ROLES,
  MODERATION_EXEMPT_ROLES,
  PUBLIC_STRUCTURE,
  BOT_ONLY_CHANNELS,
  MANUAL_LISTING_CHANNELS,
  TEAM_STRUCTURE,
  TEAM_ROLES,
  NOTIFICATION_ROLES,
  LEVELS,
};
