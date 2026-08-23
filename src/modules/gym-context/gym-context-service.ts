import type { GymContextStorePort } from './ports';
import type { GymContext } from './types';

export interface GymContextService {
  getGymContext(userId: string): Promise<GymContext>;
  getCurrentGym(userId: string): Promise<string | null>;
  setCurrentGym(userId: string, gymId: string): Promise<GymContext>;
  clearCurrentGym(userId: string): Promise<GymContext>;
}

export function createGymContextService(store: GymContextStorePort): GymContextService {
  const empty = (userId: string, updatedAt = Date.now()): GymContext => ({ userId, currentGymId: null, selectedAt: null, updatedAt });
  const requireActiveUser = async (userId: string) => {
    const user = await store.users.get(userId);
    if (!user) throw new Error(`User not found: ${userId}`);
    if (user.status !== 'active') throw new Error(`User is not active: ${userId}`);
  };

  return {
    async getGymContext(userId) {
      await requireActiveUser(userId);
      return (await store.gymContexts.get(userId)) ?? empty(userId);
    },
    async getCurrentGym(userId) {
      return (await this.getGymContext(userId)).currentGymId;
    },
    async setCurrentGym(userId, gymId) {
      await requireActiveUser(userId);
      const gym = await store.gyms.get(gymId);
      if (!gym) throw new Error(`Gym not found: ${gymId}`);
      if (gym.status === 'closed') throw new Error(`Closed gym cannot be current: ${gymId}`);
      const now = Date.now();
      const context: GymContext = { userId, currentGymId: gymId, selectedAt: now, updatedAt: now };
      await store.gymContexts.set(context);
      return context;
    },
    async clearCurrentGym(userId) {
      await requireActiveUser(userId);
      const now = Date.now();
      await store.gymContexts.clear(userId, now);
      return (await store.gymContexts.get(userId)) ?? empty(userId, now);
    },
  };
}
