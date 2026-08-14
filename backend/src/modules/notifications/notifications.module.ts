import { Global, Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EventReminderProcessor } from './jobs/event-reminder.processor';

@Global()
@Module({
  controllers: [NotificationsController],
  providers: [NotificationsService, EventReminderProcessor],
  exports: [NotificationsService],
})
export class NotificationsModule {}
