export type EquipmentCategory = 'machine' | 'free_weight' | 'rack' | 'cable' | 'cardio' | 'accessory' | 'other';
export interface Equipment { id: string; name: string; category: EquipmentCategory; description?: string | null; aliases: string[]; archived: boolean; createdAt: number; updatedAt: number; }
export type CreateEquipmentInput = Pick<Equipment, 'name' | 'category'> & Partial<Pick<Equipment, 'description' | 'aliases'>>;
export type UpdateEquipmentInput = Partial<Pick<Equipment, 'name' | 'category' | 'description' | 'aliases'>>;
