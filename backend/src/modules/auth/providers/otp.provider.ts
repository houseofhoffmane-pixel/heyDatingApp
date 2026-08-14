/**
 * OTP provider interface.
 *
 * Two implementations:
 *  - OtpStubProvider: returns success when the code matches OTP_STUB_CODE
 *    (default 123456) or when OTP_STUB_CODE is blank (accept anything).
 *  - OtpTwilioProvider: hits Twilio Verify.
 *
 * Swap via TWILIO_PROVIDER=stub|real in .env.
 */

export const OTP_PROVIDER = Symbol('OTP_PROVIDER');

export interface OtpProvider {
  /** Send a code to the given E.164 phone via SMS. */
  send(phoneE164: string): Promise<{ sent: true }>;

  /** Validate a code the user submitted. Returns true on match. */
  check(phoneE164: string, code: string): Promise<boolean>;
}
