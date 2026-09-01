import type { TrainingIntent } from '../candidate-resolution';

export type ExperienceLevel = 'beginner' | 'intermediate' | 'advanced' | 'unknown';
export type TrainingGoal = 'strength' | 'hypertrophy' | 'general_fitness' | 'conditioning' | 'mobility';
export type UserStatus = 'active' | 'archived';
export type UserVisibility = 'private' | 'followers' | 'public';
export type AuthProvider = 'supabase';

export interface AuthenticatedPrincipal {
  provider: AuthProvider;
  subject: string;
  email?: string | null;
  displayName?: string | null;
}

export interface UserTrainingPreferences {
  preferredUnits: 'metric' | 'imperial';
  preferredTrainingIntent?: TrainingIntent | null;
  defaultRestSeconds?: number | null;
  preferMachines?: boolean | null;
  preferFreeWeights?: boolean | null;
}

export interface UserPrivacySettings {
  profileVisibility: UserVisibility;
  workoutVisibilityDefault: UserVisibility;
  programVisibilityDefault: UserVisibility;
}

export interface UserProfile {
  id: string;
  authProvider?: AuthProvider | null;
  authSubject?: string | null;
  displayName: string;
  avatarUri?: string | null;
  experienceLevel: ExperienceLevel;
  trainingGoals: TrainingGoal[];
  preferences: UserTrainingPreferences;
  privacy: UserPrivacySettings;
  status: UserStatus;
  createdAt: number;
  updatedAt: number;
}

export type CreateUserInput = Pick<UserProfile, 'displayName'> & Partial<Pick<UserProfile, 'avatarUri' | 'experienceLevel' | 'trainingGoals' | 'preferences' | 'privacy'>>;
export type UpdateUserInput = Partial<Pick<UserProfile, 'displayName' | 'avatarUri' | 'experienceLevel' | 'trainingGoals'>> & {
  preferences?: Partial<UserTrainingPreferences>;
  privacy?: Partial<UserPrivacySettings>;
};
