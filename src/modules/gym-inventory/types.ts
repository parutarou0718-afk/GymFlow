export type InventoryStatus = 'available' | 'unavailable' | 'unknown';
export interface EquipmentCapabilities { minWeightKg?: number; maxWeightKg?: number; incrementKg?: number; maxResistanceKg?: number; }
export interface GymEquipmentInventoryItem { id: string; gymId: string; equipmentId: string; quantity: number; area?: string | null; notes?: string | null; status: InventoryStatus; verified: boolean; verifiedAt?: number | null; capabilities?: EquipmentCapabilities | null; createdAt: number; updatedAt: number; }
export type AddGymEquipmentInput = Partial<Pick<GymEquipmentInventoryItem, 'quantity' | 'area' | 'notes' | 'status' | 'verified' | 'verifiedAt' | 'capabilities'>>;
export type UpdateGymEquipmentInput = Partial<Pick<GymEquipmentInventoryItem, 'quantity' | 'area' | 'notes' | 'status' | 'verified' | 'verifiedAt' | 'capabilities'>>;
