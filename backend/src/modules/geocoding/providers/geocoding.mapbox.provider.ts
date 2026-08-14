import { Injectable, Logger } from '@nestjs/common';
import { GeocodeResult, GeocodingProvider } from './geocoding.provider';
import { loadEnv } from '../../../common/config/env';

/**
 * Mapbox Forward Geocoding v5. We use the `mapbox.places` permanent
 * endpoint so results are storable per Mapbox ToS.
 *
 * `bias` translates into `proximity=lng,lat` so an ambiguous address
 * resolves toward the right city.
 */
@Injectable()
export class GeocodingMapboxProvider implements GeocodingProvider {
  private readonly logger = new Logger(GeocodingMapboxProvider.name);

  async geocode(address: string, bias?: { lat: number; lng: number }): Promise<GeocodeResult | null> {
    const env = loadEnv();
    if (!env.MAPBOX_TOKEN) throw new Error('MAPBOX_PROVIDER=real requires MAPBOX_TOKEN');

    const params = new URLSearchParams({ access_token: env.MAPBOX_TOKEN, limit: '1' });
    if (bias) params.set('proximity', `${bias.lng},${bias.lat}`);
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?${params}`;

    const res = await fetch(url);
    if (!res.ok) {
      this.logger.warn(`mapbox geocode ${res.status}: ${await res.text()}`);
      return null;
    }
    const json = (await res.json()) as { features?: Array<{ center: [number, number]; place_name?: string; relevance?: number }> };
    const top = json.features?.[0];
    if (!top) return null;
    const [lng, lat] = top.center;
    return {
      lat, lng,
      formattedAddress: top.place_name,
      confidence: top.relevance,
    };
  }
}
