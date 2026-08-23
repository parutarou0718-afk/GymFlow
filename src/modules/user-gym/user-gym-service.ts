import { generateId } from '../../lib/utils';
import { createGymService } from '../gym';
import { createUserService } from '../user';
import type { UserGymStorePort } from './ports';
import type { ListUserGymsOptions, MembershipStatus, RecentGymsOptions, SetMembershipInput, UserGymRelationship } from './types';

const membershipStatuses: readonly MembershipStatus[] = ['active', 'inactive', 'unknown'];

function isEmpty(item: UserGymRelationship): boolean {
  return !item.isHome && !item.isFavorite && item.lastVisitedAt == null && item.membershipStatus == null && item.membershipStartedAt == null && item.membershipExpiresAt == null;
}

function updatedAt(item: UserGymRelationship): number { return Math.max(Date.now(), item.updatedAt + 1); }

function newRelationship(userId: string, gymId: string): UserGymRelationship {
  const now = Date.now();
  return { id: generateId(), userId, gymId, isHome: false, isFavorite: false, lastVisitedAt: null, membershipStatus: null, membershipStartedAt: null, membershipExpiresAt: null, createdAt: now, updatedAt: now };
}

export interface UserGymService {
  getUserGymRelationship(userId: string, gymId: string): Promise<UserGymRelationship | null>;
  listUserGyms(userId: string, options?: ListUserGymsOptions): Promise<UserGymRelationship[]>;
  getHomeGym(userId: string): Promise<UserGymRelationship | null>;
  setHomeGym(userId: string, gymId: string): Promise<UserGymRelationship>;
  clearHomeGym(userId: string): Promise<void>;
  setFavorite(userId: string, gymId: string, favorite: boolean): Promise<UserGymRelationship | null>;
  recordGymVisit(userId: string, gymId: string, visitedAt?: number): Promise<UserGymRelationship>;
  getRecentGyms(userId: string, options?: RecentGymsOptions): Promise<UserGymRelationship[]>;
  setMembership(userId: string, gymId: string, input: SetMembershipInput): Promise<UserGymRelationship>;
  clearMembership(userId: string, gymId: string): Promise<UserGymRelationship | null>;
  removeUserGymRelationship(userId: string, gymId: string): Promise<void>;
}

export function createUserGymService(store: UserGymStorePort): UserGymService {
  const users = createUserService(store);
  const gyms = createGymService(store);
  const validate = async (userId: string, gymId: string, closedForbidden: boolean) => {
    const user = await users.getUser(userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    if (user.status !== 'active') throw new Error(`User is archived: ${userId}`);
    const gym = await gyms.getGym(gymId);
    if (!gym) throw new Error(`Gym not found: ${gymId}`);
    if (closedForbidden && gym.status === 'closed') throw new Error(`Cannot modify a closed gym: ${gymId}`);
  };
  const save = async (item: UserGymRelationship): Promise<UserGymRelationship | null> => {
    if (isEmpty(item)) { await store.userGyms.delete(item.userId, item.gymId); return null; }
    await store.userGyms.upsert(item);
    return item;
  };
  const existingOrNew = async (userId: string, gymId: string) => (await store.userGyms.get(userId, gymId)) ?? newRelationship(userId, gymId);
  return {
    getUserGymRelationship: (userId, gymId) => store.userGyms.get(userId, gymId),
    async listUserGyms(userId, options = {}) {
      return (await store.userGyms.listByUser(userId)).filter(item =>
        (!options.homeOnly || item.isHome) && (!options.favoriteOnly || item.isFavorite) && (!options.visitedOnly || item.lastVisitedAt != null) && (!options.membershipStatus || item.membershipStatus === options.membershipStatus),
      );
    },
    async getHomeGym(userId) { return (await store.userGyms.listByUser(userId)).find(item => item.isHome) ?? null; },
    async setHomeGym(userId, gymId) {
      await validate(userId, gymId, true);
      const current = await existingOrNew(userId, gymId);
      const next = { ...current, isHome: true, updatedAt: updatedAt(current) };
      await store.userGyms.setHome(next);
      return next;
    },
    async clearHomeGym(userId) { await users.getUser(userId).then(user => { if (!user) throw new Error(`User not found: ${userId}`); }); await store.userGyms.clearHome(userId); },
    async setFavorite(userId, gymId, favorite) {
      await validate(userId, gymId, false);
      const current = await store.userGyms.get(userId, gymId);
      if (!current && !favorite) return null;
      const base = current ?? newRelationship(userId, gymId);
      return save({ ...base, isFavorite: favorite, updatedAt: updatedAt(base) });
    },
    async recordGymVisit(userId, gymId, visitedAt = Date.now()) {
      await validate(userId, gymId, true);
      if (!Number.isFinite(visitedAt)) throw new Error('Invalid visit timestamp');
      const current = await existingOrNew(userId, gymId);
      const next = { ...current, lastVisitedAt: Math.max(current.lastVisitedAt ?? Number.NEGATIVE_INFINITY, visitedAt), updatedAt: updatedAt(current) };
      await store.userGyms.upsert(next);
      return next;
    },
    async getRecentGyms(userId, options = {}) {
      const limit = options.limit;
      if (limit != null && (!Number.isInteger(limit) || limit < 0)) throw new Error('Invalid recent gym limit');
      const items = (await store.userGyms.listByUser(userId)).filter(item => item.lastVisitedAt != null).sort((a, b) => (b.lastVisitedAt! - a.lastVisitedAt!) || a.gymId.localeCompare(b.gymId));
      return limit == null ? items : items.slice(0, limit);
    },
    async setMembership(userId, gymId, input) {
      await validate(userId, gymId, false);
      if (!membershipStatuses.includes(input.status)) throw new Error('Invalid membership status');
      const startedAt = input.startedAt ?? null; const expiresAt = input.expiresAt ?? null;
      if ((startedAt != null && !Number.isFinite(startedAt)) || (expiresAt != null && !Number.isFinite(expiresAt)) || (startedAt != null && expiresAt != null && expiresAt < startedAt)) throw new Error('Invalid membership dates');
      const current = await existingOrNew(userId, gymId);
      const next = { ...current, membershipStatus: input.status, membershipStartedAt: startedAt, membershipExpiresAt: expiresAt, updatedAt: updatedAt(current) };
      await store.userGyms.upsert(next);
      return next;
    },
    async clearMembership(userId, gymId) {
      await validate(userId, gymId, false);
      const current = await store.userGyms.get(userId, gymId);
      if (!current) return null;
      return save({ ...current, membershipStatus: null, membershipStartedAt: null, membershipExpiresAt: null, updatedAt: updatedAt(current) });
    },
    async removeUserGymRelationship(userId, gymId) { await validate(userId, gymId, false); await store.userGyms.delete(userId, gymId); },
  };
}
