import type { GymFlowStore } from '../../db/types';
import { createGymService } from '../gym';
import { createInventoryService } from '../gym-inventory';

type Status = 'active' | 'closed' | 'unknown';
type InventoryStatus = 'available' | 'unavailable' | 'unknown';
export interface GymImportData { schemaVersion: number; source: { name: string; reference: string; verifiedAt: string }; gyms: Array<{ operatorGymKey?: string; name: string; branchName?: string; address?: string; latitude?: number; longitude?: number; externalProvider?: string; externalPlaceId?: string; status: Status; inventory: Array<{ equipmentId: string; equipmentName?: string; quantity: number; area?: string; status: InventoryStatus; verified: boolean; verifiedAt?: string; capabilities?: Record<string, number> }> }> }
export interface GymImportPlan { data: GymImportData; operations: Array<{ gym: GymImportData['gyms'][number]; existingGymId?: string; gymUpdate: boolean; inventory: Array<{ input: GymImportData['gyms'][number]['inventory'][number]; existingInventoryId?: string }> }>; summary: { gymsToCreate: number; gymsToUpdate: number; inventoryToCreate: number; inventoryToUpdate: number; unchanged: number; warnings: string[] } }

function timestamp(value: string, label: string) { const result = Date.parse(value); if (!Number.isFinite(result)) throw new Error(`${label} must be a valid timestamp`); return result; }
function same(a: unknown, b: unknown) { return JSON.stringify(a) === JSON.stringify(b); }
export function parseGymImportCsv(source: string): GymImportData {
  const [headerLine, ...lines] = source.trim().split(/\r?\n/); const headers = headerLine.split(',').map(value => value.trim());
  const rows = lines.filter(Boolean).map((line, index) => Object.fromEntries(line.split(',').map((value, column) => [headers[column], value.trim()]))) as Array<Record<string, string>>;
  if (!rows.length) throw new Error('CSV must contain at least one Gym inventory row');
  const first = rows[0]; const grouped = new Map<string, GymImportData['gyms'][number]>();
  for (const [index, row] of rows.entries()) {
    const key = row.operatorGymKey || `${row.externalProvider}:${row.externalPlaceId}`; if (!key || key === ':') throw new Error(`CSV row ${index + 2} requires Gym identity`);
    let gym = grouped.get(key); if (!gym) { gym = { operatorGymKey: row.operatorGymKey || undefined, name: row.name, branchName: row.branchName || undefined, address: row.address || undefined, externalProvider: row.externalProvider || undefined, externalPlaceId: row.externalPlaceId || undefined, status: row.status as Status, inventory: [] }; grouped.set(key, gym); }
    gym.inventory.push({ equipmentId: row.equipmentId, equipmentName: row.equipmentName || undefined, quantity: Number(row.quantity), area: row.area || undefined, status: row.inventoryStatus as InventoryStatus, verified: row.verified === 'true', verifiedAt: row.verifiedAt || undefined });
  }
  return { schemaVersion: 1, source: { name: first.sourceName, reference: first.sourceRef, verifiedAt: first.sourceVerifiedAt }, gyms: [...grouped.values()] };
}

export function createGymDataImportService(store: GymFlowStore) {
  const gyms = createGymService(store); const inventory = createInventoryService(store);
  async function plan(data: GymImportData): Promise<GymImportPlan> {
    if (data.schemaVersion !== 1) throw new Error('Unsupported schemaVersion');
    if (!data.source?.name?.trim() || !data.source.reference?.trim()) throw new Error('source name and reference are required');
    timestamp(data.source.verifiedAt, 'source.verifiedAt');
    if (!Array.isArray(data.gyms) || !data.gyms.length) throw new Error('gyms must be non-empty');
    const existingGyms = await gyms.listGyms(); const gymKeys = new Set<string>(); const externalKeys = new Set<string>();
    const operations: GymImportPlan['operations'] = []; let gymsToCreate = 0, gymsToUpdate = 0, inventoryToCreate = 0, inventoryToUpdate = 0, unchanged = 0;
    for (const gym of data.gyms) {
      if (!gym.name?.trim()) throw new Error('Gym name is required');
      if (!['active', 'closed', 'unknown'].includes(gym.status)) throw new Error(`Invalid Gym status for ${gym.name}`);
      if ((gym.latitude == null) !== (gym.longitude == null)) throw new Error(`Gym ${gym.name} latitude and longitude must be provided together`);
      if (!gym.operatorGymKey && !(gym.externalProvider && gym.externalPlaceId)) throw new Error(`Gym ${gym.name} requires operatorGymKey or external identity`);
      if (gym.operatorGymKey && !gymKeys.add(gym.operatorGymKey)) throw new Error(`Duplicate operatorGymKey: ${gym.operatorGymKey}`);
      const external = gym.externalProvider && gym.externalPlaceId ? `${gym.externalProvider}:${gym.externalPlaceId}` : null;
      if (external && !externalKeys.add(external)) throw new Error(`Duplicate external identity: ${external}`);
      const byOperator = gym.operatorGymKey ? existingGyms.find(item => item.operatorGymKey === gym.operatorGymKey) : undefined;
      const byExternal = external ? existingGyms.find(item => item.externalProvider === gym.externalProvider && item.externalPlaceId === gym.externalPlaceId) : undefined;
      if (byOperator && byExternal && byOperator.id !== byExternal.id) throw new Error(`Conflicting Gym identities for ${gym.name}`);
      const existing = byOperator ?? byExternal;
      if (existing?.operatorGymKey && gym.operatorGymKey && existing.operatorGymKey !== gym.operatorGymKey) throw new Error(`operatorGymKey cannot change for ${existing.id}`);
      const gymUpdate = Boolean(existing && !same({ name: existing.name, branchName: existing.branchName ?? undefined, address: existing.address ?? undefined, latitude: existing.latitude ?? undefined, longitude: existing.longitude ?? undefined, externalProvider: existing.externalProvider ?? undefined, externalPlaceId: existing.externalPlaceId ?? undefined, operatorGymKey: existing.operatorGymKey ?? undefined, sourceName: existing.sourceName ?? undefined, sourceRef: existing.sourceRef ?? undefined, status: existing.status }, { name: gym.name, branchName: gym.branchName, address: gym.address, latitude: gym.latitude, longitude: gym.longitude, externalProvider: gym.externalProvider, externalPlaceId: gym.externalPlaceId, operatorGymKey: gym.operatorGymKey, sourceName: data.source.name, sourceRef: data.source.reference, status: gym.status }));
      if (existing && gymUpdate) gymsToUpdate++; else if (!existing) gymsToCreate++; else unchanged++;
      const seenEquipment = new Set<string>(); const items: GymImportPlan['operations'][number]['inventory'] = [];
      for (const row of gym.inventory ?? []) {
        if (seenEquipment.has(row.equipmentId)) throw new Error(`Gym ${gym.name} has duplicate equipmentId: ${row.equipmentId}`);
        seenEquipment.add(row.equipmentId);
        const equipment = await store.equipment.get(row.equipmentId);
        if (!equipment || equipment.archived) throw new Error(`Unknown canonical Equipment ID: ${row.equipmentId}`);
        if (row.equipmentName && row.equipmentName !== equipment.name) throw new Error(`equipmentName does not match canonical Equipment: ${row.equipmentId}`);
        if (!Number.isInteger(row.quantity) || row.quantity < 1) throw new Error(`Invalid quantity for ${row.equipmentId}`);
        if (!['available', 'unavailable', 'unknown'].includes(row.status)) throw new Error(`Invalid inventory status for ${row.equipmentId}`);
        if (row.verifiedAt) timestamp(row.verifiedAt, `verifiedAt for ${row.equipmentId}`);
        const existingItem = existing ? await store.inventory.getByGymAndEquipment(existing.id, row.equipmentId) : null;
        if (existingItem && same({ quantity: existingItem.quantity, area: existingItem.area ?? undefined, status: existingItem.status, verified: existingItem.verified, verifiedAt: existingItem.verifiedAt ?? undefined, capabilities: existingItem.capabilities ?? undefined }, { quantity: row.quantity, area: row.area, status: row.status, verified: row.verified, verifiedAt: row.verifiedAt ? timestamp(row.verifiedAt, 'verifiedAt') : undefined, capabilities: row.capabilities })) unchanged++; else if (existingItem) inventoryToUpdate++; else inventoryToCreate++;
        items.push({ input: row, existingInventoryId: existingItem?.id });
      }
      operations.push({ gym, existingGymId: existing?.id, gymUpdate, inventory: items });
    }
    return { data, operations, summary: { gymsToCreate, gymsToUpdate, inventoryToCreate, inventoryToUpdate, unchanged, warnings: [] } };
  }
  async function apply(importPlan: GymImportPlan) {
    for (const operation of importPlan.operations) {
      const input = operation.gym; const provenance = { sourceName: importPlan.data.source.name, sourceRef: importPlan.data.source.reference };
      const gym = operation.existingGymId ? (operation.gymUpdate ? await gyms.updateGym(operation.existingGymId, { ...input, ...provenance }) : await gyms.getGym(operation.existingGymId)) : await gyms.createGym({ ...input, ...provenance });
      if (!gym) throw new Error('Planned Gym disappeared before import apply');
      for (const item of operation.inventory) {
        const row = item.input; const patch = { quantity: row.quantity, area: row.area ?? null, status: row.status, verified: row.verified, verifiedAt: row.verifiedAt ? timestamp(row.verifiedAt, 'verifiedAt') : null, capabilities: row.capabilities ?? null };
        if (item.existingInventoryId) await inventory.updateGymEquipment(item.existingInventoryId, patch); else await inventory.addEquipmentToGym(gym.id, row.equipmentId, patch);
      }
    }
  }
  return { plan, apply };
}
