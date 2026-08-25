const PROTECTED_ROLES = new Set(['Founder', 'Administrator']);
const MODERATION_ROLE = 'Moderator';

function hasProtectedRole(member) {
  return member?.roles?.cache?.some(role => PROTECTED_ROLES.has(role.name)) || false;
}

function canAutoModerate(member, botMember) {
  if (!member || !botMember) return false;
  if (member.user?.bot) return false;
  if (hasProtectedRole(member)) return false;
  if (!member.moderatable) return false;
  return botMember.roles.highest.position > member.roles.highest.position;
}

function canManageVoice(member, botMember) {
  if (!member || !botMember) return false;
  if (hasProtectedRole(member)) return false;
  return botMember.roles.highest.position > member.roles.highest.position;
}

module.exports = {
  PROTECTED_ROLES,
  MODERATION_ROLE,
  hasProtectedRole,
  canAutoModerate,
  canManageVoice,
};
