export type GymStatus = 'active' | 'closed' | 'unknown';

export interface Gym {
  id: string;
  name: string;
  branchName?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  externalProvider?: string | null;
  externalPlaceId?: string | null;
  status: GymStatus;
  createdAt: number;
  updatedAt: number;
}

export type CreateGymInput = Pick<Gym, 'name'> & Partial<Pick<Gym, 'branchName' | 'address' | 'latitude' | 'longitude' | 'externalProvider' | 'externalPlaceId'>>;
export type UpdateGymInput = Partial<Omit<CreateGymInput, 'name'> & Pick<Gym, 'name'>>;
