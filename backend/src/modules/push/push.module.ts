import { Global, Module } from '@nestjs/common';
import { PUSH_PROVIDER } from './providers/push.provider';
import { PushStubProvider } from './providers/push.stub.provider';
import { PushFcmProvider } from './providers/push.fcm.provider';
import { PushService } from './push.service';
import { loadEnv } from '../../common/config/env';

@Global()
@Module({
  providers: [
    PushStubProvider,
    {
      provide: PUSH_PROVIDER,
      useFactory: (stub: PushStubProvider) =>
        loadEnv().FCM_PROVIDER === 'real' ? new PushFcmProvider() : stub,
      inject: [PushStubProvider],
    },
    PushService,
  ],
  exports: [PushService, PUSH_PROVIDER],
})
export class PushModule {}
