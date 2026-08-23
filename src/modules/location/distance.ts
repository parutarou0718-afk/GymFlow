import type { LocationPoint } from './types';
import { validateCoordinatePair } from '../gym/location-validation';
export function calculateDistance(from: LocationPoint, to: LocationPoint): number {
  validateCoordinatePair(from.latitude, from.longitude); validateCoordinatePair(to.latitude, to.longitude);
  const radians = (value: number) => value * Math.PI / 180;
  const dLat = radians(to.latitude - from.latitude); const dLon = radians(to.longitude - from.longitude);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) * Math.sin(dLon / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
