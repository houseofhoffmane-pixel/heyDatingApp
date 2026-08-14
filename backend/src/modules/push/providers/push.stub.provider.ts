import { Injectable, Logger } from '@nestjs/common';
import { PushPayload, PushProvider, PushTarget } from './push.provider';

@Injectable()
export class PushStubProvider implements PushProvider {
  private readonly logger = new Logger(PushStubProvider.name);

  async send(target: PushTarget, payload: PushPayload) {
    this.logger.log(
      `[stub] push → user=${target.userId} tokens=${target.fcmTokens.length} title="${payload.title}" body="${payload.body}"`,
    );
    return { sent: target.fcmTokens.length, failed: 0 };
  }
}
