-- Sprint 1 — strip the schema down to ship-scope.
--
-- Removes: places, events, checkins, event_rsvps, saved_spots,
--          saved_events, place_requests, cities, verifications,
--          admin_users, admin_audit.
-- Also removes: Visibility.spot_only, UserStatus.pending_verification,
--               ReportTargetType 'spot'+'event', a handful of
--               spot/event-flavored ReportReason values, wSameSpot
--               column on feed_config.
--
-- Sprint 3 rewrites the schema for MySQL entirely — this migration
-- exists so a currently-provisioned Postgres DB can be migrated
-- forward without a full reset.

-- ── drop dependent tables first (FKs cascade upward) ─────────

DROP TABLE IF EXISTS "checkins"        CASCADE;
DROP TABLE IF EXISTS "event_rsvps"     CASCADE;
DROP TABLE IF EXISTS "saved_spots"     CASCADE;
DROP TABLE IF EXISTS "saved_events"    CASCADE;
DROP TABLE IF EXISTS "place_requests"  CASCADE;
DROP TABLE IF EXISTS "events"          CASCADE;
DROP TABLE IF EXISTS "places"          CASCADE;
DROP TABLE IF EXISTS "cities"          CASCADE;
DROP TABLE IF EXISTS "verifications"   CASCADE;
DROP TABLE IF EXISTS "admin_audit"     CASCADE;
DROP TABLE IF EXISTS "admin_users"     CASCADE;

-- ── drop enums that only those tables used ───────────────────

DROP TYPE IF EXISTS "VerificationStatus";
DROP TYPE IF EXISTS "RsvpStatus";
DROP TYPE IF EXISTS "PlaceRequestStatus";
DROP TYPE IF EXISTS "AdminRole";

-- ── slim the Visibility enum: remove spot_only ───────────────
--
-- Any user currently on spot_only becomes 'everyone' (safe default —
-- there are no spots left to be "only" visible at anyway).

UPDATE "users" SET "visibility" = 'everyone' WHERE "visibility" = 'spot_only';

ALTER TYPE "Visibility" RENAME TO "Visibility_old";
CREATE TYPE "Visibility" AS ENUM ('everyone', 'liked_only');
ALTER TABLE "users"
  ALTER COLUMN "visibility" DROP DEFAULT,
  ALTER COLUMN "visibility" TYPE "Visibility" USING "visibility"::text::"Visibility",
  ALTER COLUMN "visibility" SET DEFAULT 'everyone';
DROP TYPE "Visibility_old";

-- ── slim the UserStatus enum: remove pending_verification ────

UPDATE "users" SET "status" = 'active' WHERE "status" = 'pending_verification';

ALTER TYPE "UserStatus" RENAME TO "UserStatus_old";
CREATE TYPE "UserStatus" AS ENUM ('onboarding', 'active', 'paused', 'hidden', 'banned', 'deleted');
ALTER TABLE "users"
  ALTER COLUMN "status" DROP DEFAULT,
  ALTER COLUMN "status" TYPE "UserStatus" USING "status"::text::"UserStatus",
  ALTER COLUMN "status" SET DEFAULT 'onboarding';
DROP TYPE "UserStatus_old";

-- ── slim ReportTargetType: profile only ──────────────────────

DELETE FROM "reports" WHERE "target_type" IN ('spot', 'event');

ALTER TYPE "ReportTargetType" RENAME TO "ReportTargetType_old";
CREATE TYPE "ReportTargetType" AS ENUM ('profile');
ALTER TABLE "reports"
  ALTER COLUMN "target_type" TYPE "ReportTargetType" USING "target_type"::text::"ReportTargetType";
DROP TYPE "ReportTargetType_old";

-- ── slim ReportReason: drop spot/event-specific reasons ──────

UPDATE "reports" SET "reason" = 'other'
 WHERE "reason" IN ('closed', 'wrong_info', 'unsafe', 'duplicate', 'misleading', 'cancelled');

ALTER TYPE "ReportReason" RENAME TO "ReportReason_old";
CREATE TYPE "ReportReason" AS ENUM ('fake', 'inappropriate', 'harassment', 'spam', 'underage', 'scam', 'other');
ALTER TABLE "reports"
  ALTER COLUMN "reason" TYPE "ReportReason" USING "reason"::text::"ReportReason";
DROP TYPE "ReportReason_old";

-- ── drop wSameSpot from feed_config, renormalize defaults ────

ALTER TABLE "feed_config" DROP COLUMN IF EXISTS "w_same_spot";

UPDATE "feed_config" SET
  "w_recency"                = 0.30,
  "w_mutual_interests"       = 0.25,
  "w_distance"               = 0.20,
  "w_reciprocal"             = 0.20,
  "w_recently_shown_penalty" = 0.05
 WHERE "id" = 1;

-- ── clean up the location column left over on profiles ──────

-- profiles.location stays; still used for distance filter.
