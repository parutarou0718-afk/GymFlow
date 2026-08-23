import type { GymLocationReader, LocationProvider } from './ports';
import { calculateDistance } from './distance';
import type { GymDistanceResult, LocationPoint, NearbyGymOptions, NearbyGymsResponse } from './types';

export const unavailableLocationProvider: LocationProvider = { getCurrentLocation: async () => ({ status: 'not_configured' }) };
export function createLocationService({ locationProvider, gymService }: { locationProvider: LocationProvider; gymService: GymLocationReader }) {
  const resolveOrigin = async (origin?: LocationPoint) => {
    if (origin) return { status: 'available' as const, location: origin };
    const current = await locationProvider.getCurrentLocation();
    return current.status === 'available' ? current : current.status === 'not_configured' ? { status: 'current_location_not_configured' as const } : current.status === 'permission_denied' ? { status: 'permission_denied' as const } : { status: 'current_location_unavailable' as const };
  };
  return {
    getCurrentLocation: () => locationProvider.getCurrentLocation(),
    calculateDistance,
    async getDistanceToGym(gymId: string, origin?: LocationPoint): Promise<GymDistanceResult> {
      const gym = await gymService.getGym(gymId);
      if (!gym || gym.latitude == null || gym.longitude == null) return { status: 'gym_location_unavailable' };
      const resolved = await resolveOrigin(origin); if (resolved.status !== 'available') return resolved;
      return { status: 'available', meters: calculateDistance(resolved.location, { latitude: gym.latitude, longitude: gym.longitude }) };
    },
    async listNearbyGyms(options: NearbyGymOptions = {}): Promise<NearbyGymsResponse> {
      const resolved = await resolveOrigin(options.origin); if (resolved.status !== 'available') return resolved;
      const gyms = await gymService.listGyms();
      const items = gyms.filter(gym => gym.status !== 'closed' && gym.latitude != null && gym.longitude != null).map(gym => ({ gym, distanceMeters: calculateDistance(resolved.location, { latitude: gym.latitude!, longitude: gym.longitude! }) })).filter(item => options.maxDistanceMeters == null || item.distanceMeters <= options.maxDistanceMeters).sort((a, b) => a.distanceMeters - b.distanceMeters || a.gym.id.localeCompare(b.gym.id));
      return { status: 'available', gyms: options.limit == null ? items : items.slice(0, options.limit) };
    },
  };
}
