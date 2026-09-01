// ========================================
// GymFlow - App Configuration
// ========================================

// App-wide settings
const APP_CONFIG = {
  appName: 'GymFlow',
  schemaVersion: 1,
  defaultWeightUnit: 'kg' as 'kg' | 'lbs',
  syncOnStartup: false,
  syncIntervalMs: 5 * 60 * 1000, // 5 minutes
};

export default APP_CONFIG;
