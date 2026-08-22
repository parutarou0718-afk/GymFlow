import { generateId } from '../../lib/utils';
import type { EquipmentStorePort } from './ports';
import type { CreateEquipmentInput, Equipment, UpdateEquipmentInput } from './types';

export function createEquipmentService(store: EquipmentStorePort) {
  return {
    async createEquipment(input: CreateEquipmentInput): Promise<Equipment> {
      const now = Date.now();
      const equipment: Equipment = { id: generateId(), name: input.name.trim(), category: input.category, description: input.description ?? null, aliases: input.aliases ?? [], archived: false, createdAt: now, updatedAt: now };
      if (!equipment.name) throw new Error('Equipment name is required');
      await store.equipment.create(equipment);
      return equipment;
    },
    async getEquipment(equipmentId: string): Promise<Equipment | null> {
      const equipment = await store.equipment.get(equipmentId);
      return equipment?.archived ? null : equipment;
    },
    listEquipment: () => store.equipment.list(),
    searchEquipment: (query: string) => store.equipment.search(query),
    async updateEquipment(equipmentId: string, patch: UpdateEquipmentInput): Promise<Equipment> {
      const current = await store.equipment.get(equipmentId);
      if (!current || current.archived) throw new Error(`Equipment not found: ${equipmentId}`);
      const next = { ...current, ...patch, name: patch.name?.trim() || current.name, aliases: patch.aliases ?? current.aliases, updatedAt: Date.now() };
      await store.equipment.update(next);
      return next;
    },
    async archiveEquipment(equipmentId: string): Promise<Equipment> {
      const current = await store.equipment.get(equipmentId);
      if (!current) throw new Error(`Equipment not found: ${equipmentId}`);
      const next = { ...current, archived: true, updatedAt: Date.now() };
      await store.equipment.update(next);
      return next;
    },
  };
}
