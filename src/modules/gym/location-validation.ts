export function validateLatitude(value: number): void {
  if (!Number.isFinite(value) || value < -90 || value > 90) throw new Error('Latitude must be between -90 and 90');
}

export function validateLongitude(value: number): void {
  if (!Number.isFinite(value) || value < -180 || value > 180) throw new Error('Longitude must be between -180 and 180');
}

export function validateCoordinatePair(latitude: number | null | undefined, longitude: number | null | undefined): void {
  const hasLatitude = latitude != null;
  const hasLongitude = longitude != null;
  if (hasLatitude !== hasLongitude) throw new Error('Latitude and longitude must be provided or cleared together');
  if (hasLatitude) validateLatitude(latitude!);
  if (hasLongitude) validateLongitude(longitude!);
}
