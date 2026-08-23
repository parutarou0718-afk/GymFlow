import type { Gym } from '../gym';

export interface LocationPoint { latitude: number; longitude: number; accuracyMeters?: number | null; timestamp?: number | null; }
export type CurrentLocationResult = { status: 'available'; location: LocationPoint } | { status: 'not_configured' } | { status: 'permission_denied' } | { status: 'unavailable' };
export type GymDistanceResult = { status: 'available'; meters: number } | { status: 'gym_location_unavailable' } | { status: 'current_location_not_configured' } | { status: 'permission_denied' } | { status: 'current_location_unavailable' };
export interface NearbyGymOptions { origin?: LocationPoint; maxDistanceMeters?: number; limit?: number; }
export interface NearbyGymResult { gym: Gym; distanceMeters: number; }
export type NearbyGymsResponse = { status: 'available'; gyms: NearbyGymResult[] } | { status: 'current_location_not_configured' } | { status: 'permission_denied' } | { status: 'current_location_unavailable' };
