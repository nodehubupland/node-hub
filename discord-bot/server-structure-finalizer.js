// Discord structure is frozen.
// This module intentionally performs NO role/category/channel synchronization.
// The existing New Box Games server structure is the source of truth.
// Upland Data integration may use existing channels, but must never modify roles,
// categories, channels, permissions, onboarding, or naming.

function synchronize() {
  return Promise.resolve();
}

module.exports = { synchronize };
