// ========================================
// GymFlow - App Configuration
// ========================================

import { isConfigured, configureSupabase } from '../lib/supabase';

// App-wide settings
const APP_CONFIG = {
  appName: 'GymFlow',
  schemaVersion: 1,
  defaultWeightUnit: 'kg' as 'kg' | 'lbs',
  syncOnStartup: true,
  syncIntervalMs: 5 * 60 * 1000, // 5 minutes
};

export default APP_CONFIG;
