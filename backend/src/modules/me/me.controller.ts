import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Put,
} from '@nestjs/common';
import { MeService } from './me.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { PatchProfileDto } from '../onboarding/dto/patch-profile.dto';
import { PutSettingsDto } from './dto/put-settings.dto';
import { AccountStatusDto } from './dto/account-status.dto';
import { PutEmergencyContactDto } from './dto/emergency-contact.dto';
import { ConnectLinkedAccountDto } from './dto/linked-account.dto';

/**
 * `/me/*` covers everything self-management. Settings, account status,
 * account delete, emergency contact, linked accounts are flat namespaces
 * (`/settings`, `/account/*`, etc.) per spec — we register them here for
 * proximity since they all share MeService.
 */
@Controller()
export class MeController {
  constructor(private readonly svc: MeService) {}

  // ── /me ──────────────────────────────────────────────────────

  @Get('me') me(@CurrentUserId() userId: string) { return this.svc.me(userId); }

  @Patch('me/profile')
  patchProfile(@CurrentUserId() userId: string, @Body() body: PatchProfileDto) {
    return this.svc.patchProfile(userId, body);
  }

  // ── /settings ────────────────────────────────────────────────

  @Get('settings')
  getSettings(@CurrentUserId() userId: string) {
    return this.svc.getSettings(userId);
  }

  @Put('settings')
  putSettings(@CurrentUserId() userId: string, @Body() body: PutSettingsDto) {
    return this.svc.putSettings(userId, body);
  }

  // ── /account ─────────────────────────────────────────────────

  @Put('account/status')
  setStatus(@CurrentUserId() userId: string, @Body() body: AccountStatusDto) {
    return this.svc.setAccountStatus(userId, body);
  }

  @Delete('account')
  @HttpCode(HttpStatus.OK)
  deleteAccount(@CurrentUserId() userId: string) {
    return this.svc.deleteAccount(userId);
  }

  // ── /emergency-contact ───────────────────────────────────────

  @Get('emergency-contact')
  getEmergency(@CurrentUserId() userId: string) {
    return this.svc.getEmergencyContact(userId);
  }

  @Post('emergency-contact')
  putEmergency(@CurrentUserId() userId: string, @Body() body: PutEmergencyContactDto) {
    return this.svc.putEmergencyContact(userId, body);
  }

  @Delete('emergency-contact')
  deleteEmergency(@CurrentUserId() userId: string) {
    return this.svc.deleteEmergencyContact(userId);
  }

  // ── /linked-accounts/:provider ───────────────────────────────

  @Post('linked-accounts/:provider/connect')
  @HttpCode(HttpStatus.OK)
  connect(
    @CurrentUserId() userId: string,
    @Param('provider') provider: string,
    @Body() body: ConnectLinkedAccountDto,
  ) {
    return this.svc.connectLinkedAccount(userId, provider, body);
  }

  @Delete('linked-accounts/:provider')
  disconnect(@CurrentUserId() userId: string, @Param('provider') provider: string) {
    return this.svc.disconnectLinkedAccount(userId, provider);
  }
}
