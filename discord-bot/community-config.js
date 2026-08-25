const ROLE_DEFINITIONS = [
  { name: 'Founder', color: 0xF5A623 },
  { name: 'Administrator', color: 0xE74C3C },
  { name: 'Bot', color: 0x5865F2, managed: false },
  { name: 'Moderator', color: 0x2ECC71 },
  { name: 'Developer', color: 0x3498DB },
  { name: 'Partner', color: 0x1ABC9C },
  { name: 'Legend', color: 0xE67E22 },
  { name: 'Elite', color: 0x9B59B6 },
  { name: 'Contrib', color: 0x2ECC71 },
  { name: 'Active', color: 0x3498DB },
  { name: 'Member', color: 0x7F8C8D },
  { name: 'Uplander', color: 0x95A5A6 },
  { name: 'Verified', color: 0xF1C40F },
  { name: 'Upland Listings', color: 0xF39C12 },
  { name: 'Treasure Hunt', color: 0xF1C40F },
  { name: 'Upland News', color: 0x3498DB },
  { name: 'Node Hub Content', color: 0xE74C3C },
  { name: 'Community', color: 0x1ABC9C },
];

const PUBLIC_STRUCTURE = [
  { name: '📌 START HERE', channels: ['welcome', 'rules', 'announcements'] },
  { name: '🌐 COMMUNITY', channels: ['general', 'suggestions', 'community-promo', 'partnerships', 'events'] },
  { name: '🌎 UPLAND', channels: ['upland', 'treasure-hunt', 'upland-wins', 'upland-discussion'] },
  { name: '🤖 NODE HUB', channels: ['getting-started', 'support', 'leaderboard', 'player-stats'] },
  { name: '📊 UPLAND DATA', channels: ['bsts-assets', 'bsts-properties', 'new-listings', 'listing-alerts', 'treasure-results', 'upland-alerts'] },
  { name: '🔊 VOICE', voiceChannels: ['Upland', 'Launches', 'Node Hub', 'General'] },
  { name: '💰 SUPPORT NODE HUB', channels: ['donate'] },
];

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

module.exports = { ROLE_DEFINITIONS, PUBLIC_STRUCTURE, TEAM_STRUCTURE, TEAM_ROLES, NOTIFICATION_ROLES, LEVELS };
