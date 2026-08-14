import { Module } from '@nestjs/common';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { VerificationController } from './verification.controller';
import { VerificationService } from './verification.service';
import { FaceMatchProcessor } from './jobs/face-match.processor';
import { FACE_MATCH_PROVIDER } from './providers/face-match.provider';
import { FaceMatchStubProvider } from './providers/face-match.stub.provider';
import { FaceMatchRekognitionProvider } from './providers/face-match.rekognition.provider';
import { loadEnv } from '../../common/config/env';

@Module({
  imports: [OnboardingModule], // for completeOnboardingOrThrow
  controllers: [VerificationController],
  providers: [
    VerificationService,
    FaceMatchProcessor,
    FaceMatchStubProvider,
    {
      provide: FACE_MATCH_PROVIDER,
      useFactory: (stub: FaceMatchStubProvider) =>
        loadEnv().REKOGNITION_PROVIDER === 'real'
          ? new FaceMatchRekognitionProvider()
          : stub,
      inject: [FaceMatchStubProvider],
    },
  ],
  exports: [VerificationService],
})
export class VerificationModule {}
