/**
 * Centralised list of every BullMQ queue. Importing from here makes typos
 * a compile-time error and lets you grep usage of each pipeline.
 *
 * As later steps land they add: photo-moderation, checkin-expiry,
 * unmatch-fairy, event-reminder, account-purge, auto-resume, digest.
 */
export const QUEUE_FACE_MATCH = 'face-match';
