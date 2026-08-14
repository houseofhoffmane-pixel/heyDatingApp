import { Global, Module } from '@nestjs/common';
import { GEOCODING_PROVIDER } from './providers/geocoding.provider';
import { GeocodingStubProvider } from './providers/geocoding.stub.provider';
import { GeocodingMapboxProvider } from './providers/geocoding.mapbox.provider';
import { loadEnv } from '../../common/config/env';

@Global()
@Module({
  providers: [
    GeocodingStubProvider,
    {
      provide: GEOCODING_PROVIDER,
      useFactory: (stub: GeocodingStubProvider) =>
        loadEnv().MAPBOX_PROVIDER === 'real' ? new GeocodingMapboxProvider() : stub,
      inject: [GeocodingStubProvider],
    },
  ],
  exports: [GEOCODING_PROVIDER],
})
export class GeocodingModule {}
