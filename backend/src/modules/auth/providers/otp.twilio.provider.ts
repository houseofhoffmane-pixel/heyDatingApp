import { Injectable, Logger } from '@nestjs/common';
import { OtpProvider } from './otp.provider';
import { loadEnv } from '../../../common/config/env';
import { ApiError } from '../../../common/errors/api-error';

/**
 * Twilio Verify v2 — uses the Verifications + VerificationChecks endpoints
 * so Twilio owns OTP generation, expiry, fraud signals, retry throttling.
 * Docs: https://www.twilio.com/docs/verify/api
 *
 * Auth is HTTP Basic with the account SID and auth token. We avoid pulling
 * the twilio SDK to keep deps lean; fetch() is enough.
 */
@Injectable()
export class OtpTwilioProvider implements OtpProvider {
  private readonly logger = new Logger(OtpTwilioProvider.name);

  private get cfg() {
    const env = loadEnv();
    if (!env.TWILIO_ACCOUNT_SID || !env.TWILIO_AUTH_TOKEN || !env.TWILIO_VERIFY_SID) {
      throw new Error('TWILIO_PROVIDER=real requires TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_VERIFY_SID');
    }
    const authHeader = 'Basic ' + Buffer.from(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`).toString('base64');
    return {
      verifySid: env.TWILIO_VERIFY_SID,
      authHeader,
    };
  }

  async send(phoneE164: string) {
    const { verifySid, authHeader } = this.cfg;
    const body = new URLSearchParams({ To: phoneE164, Channel: 'sms' });
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/Verifications`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(`Twilio Verify send failed: ${res.status} ${text}`);
      // Twilio's 429 surfaces as a rate-limit to the caller.
      if (res.status === 429) {
        throw ApiError.tooManyRequests('OTP_RATE_LIMITED', 'Too many OTP requests. Try again shortly.');
      }
      throw ApiError.internal('OTP_SEND_FAILED', 'Failed to send code.');
    }
    return { sent: true as const };
  }

  async check(phoneE164: string, code: string) {
    const { verifySid, authHeader } = this.cfg;
    const body = new URLSearchParams({ To: phoneE164, Code: code });
    const res = await fetch(
      `https://verify.twilio.com/v2/Services/${verifySid}/VerificationChecks`,
      {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: body.toString(),
      },
    );
    if (!res.ok) return false;
    const json = (await res.json()) as { status?: string };
    return json.status === 'approved';
  }
}
