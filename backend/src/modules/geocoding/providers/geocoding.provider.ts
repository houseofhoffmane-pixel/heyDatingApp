/**
 * Geocoding — address → (lat, lng). Used by admin endpoints when staff
 * add a new Spot or non-place-based Event.
 *
 * Two implementations, selected by MAPBOX_PROVIDER=stub|real:
 *   - GeocodingStubProvider: returns the city's center (or a deterministic
 *     jitter from the address hash). Lets admin flows run offline.
 *   - GeocodingMapboxProvider: hits the Mapbox geocoding API.
 */
export const GEOCODING_PROVIDER = Symbol('GEOCODING_PROVIDER');

export interface GeocodeResult {
  lat: number;
  lng: number;
  /** Human-readable resolution of the query, if the provider returns it. */
  formattedAddress?: string;
  /** Provider's confidence (0..1) — informational. */
  confidence?: number;
}

export interface GeocodingProvider {
  /**
   * Resolve `address` to coords. Caller may pass `bias` (e.g. a city center)
   * to nudge ambiguous lookups toward the right region.
   */
  geocode(address: string, bias?: { lat: number; lng: number }): Promise<GeocodeResult | null>;
}
