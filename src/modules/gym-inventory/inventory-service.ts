import { generateId } from '../../lib/utils';
import type { InventoryStorePort } from './ports';
import type { AddGymEquipmentInput, GymEquipmentInventoryItem, UpdateGymEquipmentInput } from './types';

export function createInventoryService(store: InventoryStorePort) {
  return {
    async addEquipmentToGym(gymId: string, equipmentId: string, input: AddGymEquipmentInput = {}): Promise<GymEquipmentInventoryItem> {
      const [gym, equipment, existing] = await Promise.all([store.gyms.get(gymId), store.equipment.get(equipmentId), store.inventory.getByGymAndEquipment(gymId, equipmentId)]);
      if (!gym) throw new Error(`Gym not found: ${gymId}`);
      if (!equipment || equipment.archived) throw new Error(`Equipment not found: ${equipmentId}`);
      if (existing) throw new Error('Equipment already exists in this gym inventory');
      const quantity = input.quantity ?? 1;
      if (quantity < 1) throw new Error('Inventory quantity must be at least 1');
      const now = Date.now();
      const item: GymEquipmentInventoryItem = { id: generateId(), gymId, equipmentId, quantity, area: input.area ?? null, notes: input.notes ?? null, status: input.status ?? 'available', verified: input.verified ?? false, verifiedAt: input.verifiedAt ?? null, createdAt: now, updatedAt: now };
      await store.inventory.create(item);
      return item;
    },
    async removeEquipmentFromGym(gymId: string, equipmentId: string): Promise<void> { await store.inventory.removeByGymAndEquipment(gymId, equipmentId); },
    async updateGymEquipment(inventoryItemId: string, patch: UpdateGymEquipmentInput): Promise<GymEquipmentInventoryItem> {
      const current = await store.inventory.get(inventoryItemId);
      if (!current) throw new Error(`Inventory item not found: ${inventoryItemId}`);
      const quantity = patch.quantity ?? current.quantity;
      if (quantity < 1) throw new Error('Inventory quantity must be at least 1');
      const next = { ...current, ...patch, quantity, updatedAt: Date.now() };
      if (patch.verified === true && patch.verifiedAt === undefined && !current.verified) next.verifiedAt = Date.now();
      await store.inventory.update(next);
      return next;
    },
    getGymEquipment: (gymId: string) => store.inventory.listByGym(gymId),
    async hasEquipment(gymId: string, equipmentId: string): Promise<boolean> { return Boolean(await store.inventory.getByGymAndEquipment(gymId, equipmentId)); },
  };
}
