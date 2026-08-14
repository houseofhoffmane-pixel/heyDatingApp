import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post } from '@nestjs/common';
import { OnboardingService } from './onboarding.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { PrismaService } from '../../prisma/prisma.service';
import { PatchProfileDto } from './dto/patch-profile.dto';
import { SetInterestsDto } from './dto/set-interests.dto';
import { SetPromptsDto } from './dto/set-prompts.dto';
import { SetEmailPassDto } from './dto/set-email-pass.dto';

@Controller('onboarding')
export class OnboardingController {
  constructor(
    private readonly svc: OnboardingService,
    private readonly prisma: PrismaService,
  ) {}

  /** Read-only interests catalog for the onboarding UI. */
  @Get('interests-catalog')
  interestsCatalog() {
    return this.prisma.interest.findMany({ orderBy: [{ category: 'asc' }, { label: 'asc' }] });
  }

  /** Read-only prompts catalog for the onboarding UI. */
  @Get('prompts-catalog')
  promptsCatalog() {
    return this.prisma.prompt.findMany({ where: { active: true }, orderBy: { text: 'asc' } });
  }

  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  patchProfile(@CurrentUserId() userId: string, @Body() body: PatchProfileDto) {
    return this.svc.patchProfile(userId, body);
  }

  @Post('interests')
  @HttpCode(HttpStatus.OK)
  setInterests(@CurrentUserId() userId: string, @Body() body: SetInterestsDto) {
    return this.svc.setInterests(userId, body);
  }

  @Post('prompts')
  @HttpCode(HttpStatus.OK)
  setPrompts(@CurrentUserId() userId: string, @Body() body: SetPromptsDto) {
    return this.svc.setPrompts(userId, body);
  }

  @Post('email-pass')
  @HttpCode(HttpStatus.OK)
  setEmailPass(@CurrentUserId() userId: string, @Body() body: SetEmailPassDto) {
    return this.svc.setEmailPass(userId, body);
  }

  @Get('state')
  state(@CurrentUserId() userId: string) {
    return this.svc.state(userId);
  }

  /**
   * Final step of the web flow — flips onboarding → active once every
   * required field is set. 422 ONBOARDING_INCOMPLETE lists what's missing.
   */
  @Post('complete')
  @HttpCode(HttpStatus.OK)
  complete(@CurrentUserId() userId: string) {
    return this.svc.completeOnboardingOrThrow(userId);
  }
}
