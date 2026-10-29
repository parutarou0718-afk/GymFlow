import { generateId } from '../../lib/utils';
import type { UserStorePort } from './ports';
import { createDefaultUser, DEFAULT_LOCAL_USER_ID } from './seed';
import type { AuthenticatedPrincipal, CreateUserInput, ExperienceLevel, TrainingGoal, UpdateUserInput, UserProfile, UserTrainingPreferences, UserPrivacySettings, UserVisibility } from './types';

const experienceLevels: readonly ExperienceLevel[] = ['beginner', 'intermediate', 'advanced', 'unknown'];
const trainingGoals: readonly TrainingGoal[] = ['strength', 'hypertrophy', 'general_fitness', 'conditioning', 'mobility'];
const visibilityValues: readonly UserVisibility[] = ['private', 'followers', 'public'];
const trainingIntents = ['strength', 'hypertrophy', 'general_fitness', 'conditioning', 'rehab', 'unknown'] as const;

function assertValue<T extends string>(value: unknown, values: readonly T[], label: string): asserts value is T {
  if (typeof value !== 'string' || !values.includes(value as T)) throw new Error(`Invalid ${label}`);
}

function normalizePreferences(value: Partial<UserTrainingPreferences> | undefined, current?: UserTrainingPreferences): UserTrainingPreferences {
  const next: UserTrainingPreferences = {
    preferredUnits: 'metric' as const,
    preferredTrainingIntent: 'unknown',
    defaultRestSeconds: null,
    preferMachines: null,
    preferFreeWeights: null,
    ...current,
    ...value,
  };
  assertValue(next.preferredUnits, ['metric', 'imperial'] as const, 'preferred units');
  if (next.preferredTrainingIntent != null) assertValue(next.preferredTrainingIntent, trainingIntents, 'preferred training intent');
  if (next.defaultRestSeconds != null && (typeof next.defaultRestSeconds !== 'number' || !Number.isFinite(next.defaultRestSeconds) || next.defaultRestSeconds < 0)) throw new Error('defaultRestSeconds must be greater than or equal to 0');
  return next;
}

function normalizePrivacy(value: Partial<UserPrivacySettings> | undefined, current?: UserPrivacySettings): UserPrivacySettings {
  const next: UserPrivacySettings = {
    profileVisibility: 'private' as const,
    workoutVisibilityDefault: 'private' as const,
    programVisibilityDefault: 'private' as const,
    ...current,
    ...value,
  };
  assertValue(next.profileVisibility, visibilityValues, 'profile visibility');
  assertValue(next.workoutVisibilityDefault, visibilityValues, 'workout visibility');
  assertValue(next.programVisibilityDefault, visibilityValues, 'program visibility');
  return next;
}

function normalizeInput(input: CreateUserInput, id: string, now: number): UserProfile {
  const displayName = input.displayName?.trim();
  if (!displayName) throw new Error('Display name is required');
  const experienceLevel = input.experienceLevel ?? 'unknown';
  assertValue(experienceLevel, experienceLevels, 'experience level');
  const goals = [...new Set(input.trainingGoals ?? [])];
  goals.forEach(goal => assertValue(goal, trainingGoals, 'training goal'));
  return {
    id,
    displayName,
    avatarUri: input.avatarUri ?? null,
    experienceLevel,
    trainingGoals: goals,
    preferences: normalizePreferences(input.preferences),
    privacy: normalizePrivacy(input.privacy),
    status: 'active',
    createdAt: now,
    updatedAt: now,
  };
}

function nextUpdatedAt(current: UserProfile): number {
  return Math.max(Date.now(), current.updatedAt + 1);
}

export interface UserService {
  getCurrentUser(): Promise<UserProfile>;
  getUser(userId: string): Promise<UserProfile | null>;
  getPublicUserSummary(userId: string): Promise<{ id: string; displayName: string; avatarUri: string | null } | null>;
  listUsers(): Promise<UserProfile[]>;
  createUser(input: CreateUserInput): Promise<UserProfile>;
  updateUser(userId: string, patch: UpdateUserInput): Promise<UserProfile>;
  archiveUser(userId: string): Promise<UserProfile>;
  resolveAuthenticatedUser(principal: AuthenticatedPrincipal): Promise<UserProfile>;
}

export function createUserService(store: UserStorePort): UserService {
  return {
    async getCurrentUser() {
      const current = await store.users.get(DEFAULT_LOCAL_USER_ID);
      if (current) {
        if (current.status === 'archived') throw new Error('Default current user is archived');
        return current;
      }
      const defaultUser = createDefaultUser(Date.now());
      await store.users.create(defaultUser);
      return defaultUser;
    },
    getUser: userId => store.users.get(userId),
    async getPublicUserSummary(userId) {
      const user = await store.users.get(userId);
      return user?.status === 'active' ? { id: user.id, displayName: user.displayName, avatarUri: user.avatarUri ?? null } : null;
    },
    listUsers: () => store.users.list(),
    async createUser(input) {
      const user = normalizeInput(input, generateId(), Date.now());
      await store.users.create(user);
      return user;
    },
    async updateUser(userId, patch) {
      const current = await store.users.get(userId);
      if (!current) throw new Error(`User not found: ${userId}`);
      const displayName = patch.displayName === undefined ? current.displayName : patch.displayName.trim();
      if (!displayName) throw new Error('Display name is required');
      const experienceLevel = patch.experienceLevel ?? current.experienceLevel;
      assertValue(experienceLevel, experienceLevels, 'experience level');
      const goals = patch.trainingGoals === undefined ? current.trainingGoals : [...new Set(patch.trainingGoals)];
      goals.forEach(goal => assertValue(goal, trainingGoals, 'training goal'));
      const next: UserProfile = {
        ...current,
        displayName,
        avatarUri: patch.avatarUri === undefined ? current.avatarUri ?? null : patch.avatarUri,
        experienceLevel,
        trainingGoals: goals,
        preferences: normalizePreferences(patch.preferences, current.preferences),
        privacy: normalizePrivacy(patch.privacy, current.privacy),
        updatedAt: nextUpdatedAt(current),
      };
      await store.users.update(next);
      return next;
    },
    async archiveUser(userId) {
      if (userId === DEFAULT_LOCAL_USER_ID) throw new Error('Cannot archive the default current user');
      const current = await store.users.get(userId);
      if (!current) throw new Error(`User not found: ${userId}`);
      const next: UserProfile = { ...current, status: 'archived', updatedAt: nextUpdatedAt(current) };
      await store.users.update(next);
      return next;
    },
    async resolveAuthenticatedUser(principal) {
      const subject = principal.subject.trim();
      if (!subject) throw new Error('Authenticated principal subject is required');
      const existing = await store.users.findByAuthIdentity(principal.provider, subject);
      if (existing) {
        if (existing.status !== 'active') throw new Error('Authenticated Domain User is inactive');
        return existing;
      }
      const user = normalizeInput({ displayName: principal.displayName?.trim() || principal.email?.trim() || 'GymFlow User' }, generateId(), Date.now());
      const mapped: UserProfile = { ...user, authProvider: principal.provider, authSubject: subject };
      await store.users.create(mapped);
      return mapped;
    },
  };
}
