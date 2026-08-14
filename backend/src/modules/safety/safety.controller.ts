import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post,
} from '@nestjs/common';
import { ReportsService } from './reports.service';
import { BlocksService } from './blocks.service';
import { CurrentUserId } from '../auth/decorators/current-user.decorator';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateBlockDto } from './dto/create-block.dto';

@Controller()
export class SafetyController {
  constructor(
    private readonly reports: ReportsService,
    private readonly blocks: BlocksService,
  ) {}

  // ── Reports ──────────────────────────────────────────────────

  @Post('reports')
  @HttpCode(HttpStatus.CREATED)
  createReport(@CurrentUserId() userId: string, @Body() body: CreateReportDto) {
    return this.reports.create(userId, body);
  }

  @Get('reports/mine')
  listMyReports(@CurrentUserId() userId: string) {
    return this.reports.listMine(userId);
  }

  // ── Blocks ───────────────────────────────────────────────────

  @Post('blocks')
  @HttpCode(HttpStatus.OK)
  block(@CurrentUserId() userId: string, @Body() body: CreateBlockDto) {
    return this.blocks.block(userId, body.userId);
  }

  @Delete('blocks/:userId')
  @HttpCode(HttpStatus.OK)
  unblock(@CurrentUserId() userId: string, @Param('userId', new ParseUUIDPipe()) target: string) {
    return this.blocks.unblock(userId, target);
  }

  @Get('blocks')
  listBlocks(@CurrentUserId() userId: string) {
    return this.blocks.listMine(userId);
  }
}
