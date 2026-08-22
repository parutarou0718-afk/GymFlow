export type InventoryStatus = 'available' | 'unavailable' | 'unknown';
export interface GymEquipmentInventoryItem { id: string; gymId: string; equipmentId: string; quantity: number; area?: string | null; notes?: string | null; status: InventoryStatus; verified: boolean; verifiedAt?: number | null; createdAt: number; updatedAt: number; }
export type AddGymEquipmentInput = Partial<Pick<GymEquipmentInventoryItem, 'quantity' | 'area' | 'notes' | 'status' | 'verified' | 'verifiedAt'>>;
export type UpdateGymEquipmentInput = Partial<Pick<GymEquipmentInventoryItem, 'quantity' | 'area' | 'notes' | 'status' | 'verified' | 'verifiedAt'>>;
