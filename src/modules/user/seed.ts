import type { UserProfile } from './types';

export const DEFAULT_LOCAL_USER_ID = 'local_default_user';

export function createDefaultUser(now: number): UserProfile {
  return {
    id: DEFAULT_LOCAL_USER_ID,
    displayName: 'GymFlow User',
    avatarUri: null,
    experienceLevel: 'unknown',
    trainingGoals: [],
    preferences: {
      preferredUnits: 'metric',
      preferredTrainingIntent: 'unknown',
      defaultRestSeconds: null,
      preferMachines: null,
      preferFreeWeights: null,
    },
    privacy: {
      profileVisibility: 'private',
      workoutVisibilityDefault: 'private',
      programVisibilityDefault: 'private',
    },
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}
