import { Injectable, Logger } from '@nestjs/common';
import { OtpProvider } from './otp.provider';
import { loadEnv } from '../../../common/config/env';

/**
 * Local-only OTP provider. `send` just logs the phone; `check` accepts the
 * configured stub code (default "123456"). Lets the whole auth flow run
 * without Twilio credentials.
 */
@Injectable()
export class OtpStubProvider implements OtpProvider {
  private readonly logger = new Logger(OtpStubProvider.name);

  async send(phoneE164: string) {
    const code = loadEnv().OTP_STUB_CODE;
    this.logger.log(`[stub] would SMS ${phoneE164} with code ${code || '<any>'}`);
    return { sent: true as const };
  }

  async check(_phoneE164: string, code: string) {
    const expected = loadEnv().OTP_STUB_CODE;
    if (!expected) return true; // blank = accept anything
    return code === expected;
  }
}
