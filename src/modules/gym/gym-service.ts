import { generateId } from '../../lib/utils';
import type { GymStorePort } from './ports';
import type { CreateGymInput, Gym, UpdateGymInput } from './types';
import { validateCoordinatePair } from './location-validation';

export function createGymService(store: GymStorePort) {
  return {
    async createGym(input: CreateGymInput): Promise<Gym> {
      const now = Date.now();
      const gym: Gym = { id: generateId(), name: input.name.trim(), branchName: input.branchName ?? null, address: input.address ?? null, latitude: input.latitude ?? null, longitude: input.longitude ?? null, externalProvider: input.externalProvider ?? null, externalPlaceId: input.externalPlaceId ?? null, status: 'active', createdAt: now, updatedAt: now };
      if (!gym.name) throw new Error('Gym name is required');
      validateCoordinatePair(gym.latitude, gym.longitude);
      await store.gyms.create(gym);
      return gym;
    },
    getGym: (gymId: string) => store.gyms.get(gymId),
    listGyms: () => store.gyms.list(),
    async updateGym(gymId: string, patch: UpdateGymInput): Promise<Gym> {
      const current = await store.gyms.get(gymId);
      if (!current) throw new Error(`Gym not found: ${gymId}`);
      const next = { ...current, ...patch, name: patch.name?.trim() || current.name, updatedAt: Date.now() };
      validateCoordinatePair(next.latitude, next.longitude);
      await store.gyms.update(next);
      return next;
    },
    async archiveGym(gymId: string): Promise<Gym> {
      const current = await store.gyms.get(gymId);
      if (!current) throw new Error(`Gym not found: ${gymId}`);
      const next = { ...current, status: 'closed' as const, updatedAt: Date.now() };
      await store.gyms.update(next);
      return next;
    },
    searchGyms: (query: string) => store.gyms.search(query),
  };
}
