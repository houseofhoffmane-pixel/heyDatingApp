import { Global, Module } from '@nestjs/common';
import { STORAGE_PROVIDER } from './providers/storage.provider';
import { StorageStubProvider } from './providers/storage.stub.provider';
import { StorageS3Provider } from './providers/storage.s3.provider';
import { StorageService } from './storage.service';
import { StorageController } from './storage.controller';
import { loadEnv } from '../../common/config/env';

@Global()
@Module({
  providers: [
    StorageStubProvider, // also instantiated so the controller can do `instanceof` checks
    {
      provide: STORAGE_PROVIDER,
      useFactory: (stub: StorageStubProvider) => {
        return loadEnv().S3_PROVIDER === 'real' ? new StorageS3Provider() : stub;
      },
      inject: [StorageStubProvider],
    },
    StorageService,
  ],
  controllers: [StorageController],
  exports: [STORAGE_PROVIDER, StorageService],
})
export class StorageModule {}
