import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Put, Query,
} from '@nestjs/common';
import { AdminAuth } from './auth/admin-jwt.guard';
import { AdminPlacesService } from './admin-places.service';
import { AdminEventsService } from './admin-events.service';
import { AdminModerationService } from './admin-moderation.service';
import { AdminCatalogsService } from './admin-catalogs.service';
import { AdminConfigService } from './admin-config.service';
import { AdminMetricsService } from './admin-metrics.service';
import {
  CreateAdminPlaceDto, UpdateAdminPlaceDto, ActionPlaceRequestDto,
  CreateAdminEventDto, UpdateAdminEventDto,
  ListReportsDto, ActionReportDto, ActionVerificationDto, BanUserDto,
  CreatePromptDto, UpdatePromptDto, UpsertInterestDto, CreateCityDto, UpdateCityDto,
  PutFeedWeightsDto,
} from './dto/admin.dto';
import { createParamDecorator, ExecutionContext } from '@nestjs/common';

// Local helper: AdminAuth puts admin onto req.user — same shape as the
// user JWT strategy's CurrentUser, but a different field is friendlier.
const CurrentAdminId = createParamDecorator(
  (_d, ctx: ExecutionContext): string => ctx.switchToHttp().getRequest().user?.adminId,
);

/**
 * One controller for the whole admin surface. All routes are gated by
 * `@AdminAuth()` (every route here re-applies it via the class-level
 * declaration). Use `@AdminAuth({ role: 'admin' })` on bans / config /
 * destructive actions; `moderator` is the default for read + low-risk
 * mutations.
 */
@AdminAuth()
@Controller('admin')
export class AdminController {
  constructor(
    private readonly places: AdminPlacesService,
    private readonly events: AdminEventsService,
    private readonly moderation: AdminModerationService,
    private readonly catalogs: AdminCatalogsService,
    private readonly config: AdminConfigService,
    private readonly metrics: AdminMetricsService,
  ) {}

  // ── Places ───────────────────────────────────────────────────

  @Get('places') listPlaces() { return this.places.list(); }

  @Post('places')
  @HttpCode(HttpStatus.CREATED)
  createPlace(@CurrentAdminId() adminId: string, @Body() body: CreateAdminPlaceDto) {
    return this.places.create(adminId, body);
  }

  @Patch('places/:id')
  updatePlace(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdateAdminPlaceDto) {
    return this.places.update(adminId, id, body);
  }

  @AdminAuth({ role: 'admin' })
  @Delete('places/:id')
  deletePlace(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.places.remove(adminId, id);
  }

  @Get('places/requests') listPlaceRequests() { return this.places.listRequests(); }

  @Post('places/requests/:id/action')
  @HttpCode(HttpStatus.OK)
  actionPlaceRequest(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: ActionPlaceRequestDto) {
    return this.places.actionRequest(adminId, id, body);
  }

  // ── Events ───────────────────────────────────────────────────

  @Get('events') listEvents() { return this.events.list(); }

  @Post('events')
  @HttpCode(HttpStatus.CREATED)
  createEvent(@CurrentAdminId() adminId: string, @Body() body: CreateAdminEventDto) {
    return this.events.create(adminId, body);
  }

  @Patch('events/:id')
  updateEvent(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdateAdminEventDto) {
    return this.events.update(adminId, id, body);
  }

  @AdminAuth({ role: 'admin' })
  @Delete('events/:id')
  deleteEvent(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.events.remove(adminId, id);
  }

  @Get('events/:id/attendees')
  eventAttendees(@Param('id', new ParseUUIDPipe()) id: string) {
    return this.events.attendees(id);
  }

  // ── Reports ──────────────────────────────────────────────────

  @Get('reports') listReports(@Query() query: ListReportsDto) { return this.moderation.listReports(query); }

  @Post('reports/:id/action')
  @HttpCode(HttpStatus.OK)
  actionReport(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: ActionReportDto) {
    return this.moderation.actionReport(adminId, id, body);
  }

  // ── Verifications ────────────────────────────────────────────

  @Get('verifications') manualVerifications() { return this.moderation.listManualVerifications(); }

  @Post('verifications/:id')
  @HttpCode(HttpStatus.OK)
  actionVerification(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: ActionVerificationDto) {
    return this.moderation.actionVerification(adminId, id, body);
  }

  // ── Users ────────────────────────────────────────────────────

  @Get('users/:id') getUser(@Param('id', new ParseUUIDPipe()) id: string) { return this.moderation.getUser(id); }

  @AdminAuth({ role: 'admin' })
  @Post('users/:id/ban')
  @HttpCode(HttpStatus.OK)
  banUser(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: BanUserDto) {
    return this.moderation.banUser(adminId, id, body);
  }

  @AdminAuth({ role: 'admin' })
  @Post('users/:id/unban')
  @HttpCode(HttpStatus.OK)
  unbanUser(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.moderation.unbanUser(adminId, id);
  }

  // ── Catalogs ─────────────────────────────────────────────────

  @Get('prompts') listPrompts() { return this.catalogs.listPrompts(); }
  @Post('prompts')
  createPrompt(@CurrentAdminId() adminId: string, @Body() body: CreatePromptDto) { return this.catalogs.createPrompt(adminId, body); }
  @Patch('prompts/:id')
  updatePrompt(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdatePromptDto) {
    return this.catalogs.updatePrompt(adminId, id, body);
  }
  @Delete('prompts/:id')
  deletePrompt(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogs.deletePrompt(adminId, id);
  }

  @Get('interests') listInterests() { return this.catalogs.listInterests(); }
  @Put('interests')
  upsertInterest(@CurrentAdminId() adminId: string, @Body() body: UpsertInterestDto) {
    return this.catalogs.upsertInterest(adminId, body);
  }
  @Delete('interests/:id')
  deleteInterest(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string) {
    return this.catalogs.deleteInterest(adminId, id);
  }

  @Get('cities') listCities() { return this.catalogs.listCities(); }
  @Post('cities')
  createCity(@CurrentAdminId() adminId: string, @Body() body: CreateCityDto) { return this.catalogs.createCity(adminId, body); }
  @Patch('cities/:id')
  updateCity(@CurrentAdminId() adminId: string, @Param('id', new ParseUUIDPipe()) id: string, @Body() body: UpdateCityDto) {
    return this.catalogs.updateCity(adminId, id, body);
  }

  // ── Config + metrics ─────────────────────────────────────────

  @Get('config/feed-weights') getWeights() { return this.config.get(); }

  @AdminAuth({ role: 'admin' })
  @Put('config/feed-weights')
  putWeights(@CurrentAdminId() adminId: string, @Body() body: PutFeedWeightsDto) {
    return this.config.put(adminId, body);
  }

  @Get('metrics') metricsSnapshot() { return this.metrics.snapshot(); }
}
