import type { CurrentLocationResult } from './types';
import type { Gym } from '../gym';
export interface LocationProvider { getCurrentLocation(): Promise<CurrentLocationResult>; }
export interface GymLocationReader { getGym(id: string): Promise<Gym | null>; listGyms(): Promise<Gym[]>; }
