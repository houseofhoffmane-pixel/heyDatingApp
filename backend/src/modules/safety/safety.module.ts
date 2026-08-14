import { Module } from '@nestjs/common';
import { SafetyController } from './safety.controller';
import { ReportsService } from './reports.service';
import { BlocksService } from './blocks.service';

@Module({
  controllers: [SafetyController],
  providers: [ReportsService, BlocksService],
  exports: [ReportsService, BlocksService],
})
export class SafetyModule {}
