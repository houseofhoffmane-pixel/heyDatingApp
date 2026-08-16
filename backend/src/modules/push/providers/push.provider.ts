/**
 * Push notification provider.
 *
 * Used by:
 *   - ChatService (Step 7) when sending a message to an offline recipient.
 *   - LikesService for like / match pings.
 *
 * Step 7 ships the stub (logs the payload). Step 10 wires FCM and the
 * preference / quiet-hours gating.
 */
export const PUSH_PROVIDER = Symbol('PUSH_PROVIDER');

export interface PushPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  /** Used by APNs/iOS — defaults to default sound. */
  sound?: string;
}

export interface PushTarget {
  userId: string;
  fcmTokens: string[];
}

export interface PushProvider {
  send(target: PushTarget, payload: PushPayload): Promise<{ sent: number; failed: number }>;
}
