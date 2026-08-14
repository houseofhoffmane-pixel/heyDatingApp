import { Injectable, Logger } from '@nestjs/common';
import { createHash } from 'crypto';
import { GeocodeResult, GeocodingProvider } from './geocoding.provider';

/**
 * Returns the bias point (city center, when caller passes one) with a small
 * deterministic jitter derived from the address hash, so two addresses
 * inside the same city don't land on identical coordinates. Lets the
 * admin "add a spot" flow work without a Mapbox key.
 */
@Injectable()
export class GeocodingStubProvider implements GeocodingProvider {
  private readonly logger = new Logger(GeocodingStubProvider.name);

  async geocode(address: string, bias?: { lat: number; lng: number }): Promise<GeocodeResult | null> {
    const trimmed = address.trim();
    if (!trimmed) return null;

    // Default center: roughly Manhattan if no bias provided.
    const base = bias ?? { lat: 40.7194, lng: -73.9963 };
    const h = createHash('sha256').update(trimmed.toLowerCase()).digest();
    const dLat = ((h[0] - 128) / 128) * 0.01; // ~±1km
    const dLng = ((h[1] - 128) / 128) * 0.012;

    this.logger.log(`[stub] geocoded "${trimmed}" → ${(base.lat + dLat).toFixed(5)}, ${(base.lng + dLng).toFixed(5)}`);
    return {
      lat: base.lat + dLat,
      lng: base.lng + dLng,
      formattedAddress: trimmed,
      confidence: 0.5,
    };
  }
}
