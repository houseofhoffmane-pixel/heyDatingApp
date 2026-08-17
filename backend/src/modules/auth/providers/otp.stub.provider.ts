import { Injectable, Logger } from '@nestjs/common';
import { OtpProvider } from './otp.provider';
import { loadEnv } from '../../../common/config/env';

/**
 * Local-only OTP provider. The whole point of the stub is to let the
 * auth flow run without a real SMS provider — so it's deliberately
 * permissive:
 *
 *   - If `OTP_STUB_CODE` is set → that value AND `123456` both pass.
 *     (Both sides trimmed so a stray space in the env var doesn't
 *      silently break login.)
 *   - If `OTP_STUB_CODE` is blank → any 4–10 digit code passes.
 *
 * `123456` is always accepted regardless of env config — that's the
 * documented dev backdoor so nobody has to spelunk hPanel to sign in
 * during testing. The prod safety net is `TWILIO_PROVIDER`: setting
 * it to `real` swaps this class out entirely (see auth.module.ts).
 *
 * Every check logs the received + expected values so a mismatch is
 * obvious in the Hostinger log rather than requiring guesswork.
 */
@Injectable()
export class OtpStubProvider implements OtpProvider {
  private readonly logger = new Logger(OtpStubProvider.name);
  private static readonly DEV_BACKDOOR_CODE = '123456';

  async send(phoneE164: string) {
    const configured = (loadEnv().OTP_STUB_CODE ?? '').trim();
    const suffix = configured
      ? `or "${configured}"`
      : 'or any 4-10 digits';
    this.logger.log(`[stub] would SMS ${phoneE164} — accepted codes: "${OtpStubProvider.DEV_BACKDOOR_CODE}" ${suffix}`);
    return { sent: true as const };
  }

  async check(phoneE164: string, code: string) {
    const configured = (loadEnv().OTP_STUB_CODE ?? '').trim();
    const received = (code ?? '').trim();

    const acceptsAny = configured.length === 0;
    const matchesConfigured = !acceptsAny && received === configured;
    const matchesBackdoor = received === OtpStubProvider.DEV_BACKDOOR_CODE;

    const ok = acceptsAny || matchesConfigured || matchesBackdoor;

    if (!ok) {
      this.logger.warn(
        `[stub] OTP mismatch for ${phoneE164}: received "${received}" ` +
        `(len ${received.length}); expected "${configured}" (len ${configured.length}) ` +
        `or the backdoor "${OtpStubProvider.DEV_BACKDOOR_CODE}"`,
      );
    } else {
      this.logger.log(`[stub] OTP accepted for ${phoneE164} via ${
        matchesBackdoor ? 'backdoor' : matchesConfigured ? 'configured code' : 'accept-any'
      }`);
    }
    return ok;
  }
}
