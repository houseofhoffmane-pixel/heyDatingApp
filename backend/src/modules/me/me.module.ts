import { Module } from '@nestjs/common';
import { MeController } from './me.controller';
import { MeService } from './me.service';
import { OnboardingModule } from '../onboarding/onboarding.module';
import { AuthModule } from '../auth/auth.module';
import { AutoResumeProcessor } from './jobs/auto-resume.processor';
import { AccountPurgeProcessor } from './jobs/account-purge.processor';
import { UnmatchFairyProcessor } from './jobs/unmatch-fairy.processor';

@Module({
  imports: [
    OnboardingModule, // patch-profile shared validation
    AuthModule,       // TokensService — revoke on delete
  ],
  controllers: [MeController],
  providers: [
    MeService,
    AutoResumeProcessor,
    AccountPurgeProcessor,
    UnmatchFairyProcessor,
  ],
  exports: [MeService],
})
export class MeModule {}
