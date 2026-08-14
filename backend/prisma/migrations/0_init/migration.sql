-- Hey — initial schema migration.
-- Hand-written so PostGIS extension, geography columns, GiST indexes,
-- sorted-pair CHECK constraints, and updated_at triggers all live in one
-- place. The Prisma client is generated from schema.prisma (which declares
-- the same tables); the two stay in sync because:
--   1. Every non-geo column here matches schema.prisma exactly.
--   2. The geo columns (places.location, events.location, cities.center,
--      profiles.location) are added here with `ADD COLUMN` and are written
--      to / read from via raw SQL helpers in src/common/geo/.
--
-- If you change schema.prisma after this point, generate a follow-up
-- migration with `prisma migrate dev --create-only` and edit it the same
-- way (only Prisma-managed columns will appear in the autogen; you add the
-- geo / index / trigger pieces by hand).

-- ─────────────────────────────────────────────────────────────
-- Extensions
-- ─────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "postgis";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";  -- gen_random_uuid()

-- ─────────────────────────────────────────────────────────────
-- Enum types — names match the Prisma enum names exactly.
-- ─────────────────────────────────────────────────────────────

CREATE TYPE "UserStatus" AS ENUM ('onboarding', 'pending_verification', 'active', 'paused', 'hidden', 'banned', 'deleted');
CREATE TYPE "Visibility" AS ENUM ('everyone', 'liked_only', 'spot_only');
CREATE TYPE "Gender" AS ENUM ('woman', 'man', 'non_binary', 'trans_woman', 'trans_man', 'genderfluid', 'other');
CREATE TYPE "RelationshipIntent" AS ENUM ('longterm', 'longterm_open', 'short_open', 'short', 'figuring_out', 'friends');
CREATE TYPE "StarSign" AS ENUM ('aries', 'taurus', 'gemini', 'cancer', 'leo', 'virgo', 'libra', 'scorpio', 'sagittarius', 'capricorn', 'aquarius', 'pisces');
CREATE TYPE "Drinks" AS ENUM ('often', 'socially', 'rarely', 'never');
CREATE TYPE "Smokes" AS ENUM ('regularly', 'socially', 'trying_to_quit', 'never');
CREATE TYPE "Exercise" AS ENUM ('daily', 'few_week', 'sometimes', 'never');
CREATE TYPE "Weed420" AS ENUM ('yes', 'sometimes', 'never');
CREATE TYPE "Kids" AS ENUM ('want', 'have_want_more', 'have_done', 'dont_want', 'open', 'not_sure');
CREATE TYPE "Politics" AS ENUM ('left', 'moderate', 'right', 'not_political', 'rather_not_say');
CREATE TYPE "Religion" AS ENUM ('agnostic', 'atheist', 'christian', 'jewish', 'muslim', 'hindu', 'buddhist', 'spiritual', 'other');
CREATE TYPE "Monogamy" AS ENUM ('monogamous', 'monogamish', 'non_monogamous', 'figuring');
CREATE TYPE "PhotoStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "VerificationStatus" AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE "LikeAnchorType" AS ENUM ('photo', 'prompt');
CREATE TYPE "MatchStatus" AS ENUM ('active', 'unmatched', 'expired');
CREATE TYPE "MessageKind" AS ENUM ('text', 'place_share', 'location_share', 'system');
CREATE TYPE "MessageStatus" AS ENUM ('sent', 'delivered', 'read', 'failed');
CREATE TYPE "RsvpStatus" AS ENUM ('going', 'cancelled');
CREATE TYPE "ReportTargetType" AS ENUM ('profile', 'spot', 'event');
CREATE TYPE "ReportReason" AS ENUM ('fake', 'inappropriate', 'harassment', 'spam', 'underage', 'scam', 'closed', 'wrong_info', 'unsafe', 'duplicate', 'misleading', 'cancelled', 'other');
CREATE TYPE "ReportStatus" AS ENUM ('pending', 'reviewed', 'actioned', 'dismissed');
CREATE TYPE "AdminRole" AS ENUM ('admin', 'moderator');
CREATE TYPE "DevicePlatform" AS ENUM ('ios', 'android', 'web');
CREATE TYPE "LinkedProvider" AS ENUM ('instagram', 'spotify');
CREATE TYPE "PlaceRequestStatus" AS ENUM ('pending', 'approved', 'dismissed');

-- ─────────────────────────────────────────────────────────────
-- updated_at trigger function — reused on every table that has one.
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ─────────────────────────────────────────────────────────────
-- 3.1 users
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "users" (
  "id"               UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "phone_e164"       TEXT         NOT NULL UNIQUE,
  "country_code"     TEXT         NOT NULL,
  "email"            TEXT         UNIQUE,
  "password_hash"    TEXT,
  "dob"              DATE,
  "status"           "UserStatus" NOT NULL DEFAULT 'onboarding',
  "visibility"       "Visibility" NOT NULL DEFAULT 'everyone',
  "auto_resume_at"   TIMESTAMPTZ(6),
  "last_active_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "age_confirmed"    BOOLEAN      NOT NULL DEFAULT FALSE,
  "created_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "deleted_at"       TIMESTAMPTZ(6)
);

CREATE INDEX "users_phone_e164_idx"    ON "users"("phone_e164");
CREATE INDEX "users_status_idx"        ON "users"("status");
CREATE INDEX "users_last_active_at_idx" ON "users"("last_active_at");

CREATE TRIGGER users_updated_at BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.2 profiles
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "profiles" (
  "id"                   UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"              UUID         NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  -- name, gender, looking_for, relationship_intent, height_cm, bio are
  -- mandatory once status='active' but nullable during onboarding so a
  -- profile row can persist partial state. OnboardingService enforces
  -- completeness before allowing status to advance.
  "name"                 TEXT,
  "gender"               "Gender",
  "gender_custom"        TEXT,
  "looking_for"          TEXT[]       NOT NULL DEFAULT '{}',
  "relationship_intent"  "RelationshipIntent",
  "height_cm"            INTEGER,
  "bio"                  VARCHAR(180),
  "job"                  TEXT,
  "school"               TEXT,
  "pronouns"             TEXT,
  "star_sign"            "StarSign",
  "drinks"               "Drinks",
  "smokes"               "Smokes",
  "exercise"             "Exercise",
  "weed_420"             "Weed420",
  "kids"                 "Kids",
  "politics"             "Politics",
  "religion"             "Religion",
  "monogamy"             "Monogamy",
  "completion_pct"       INTEGER      NOT NULL DEFAULT 0,
  -- last-known location for ranking; never returned raw.
  "location"             geography(Point, 4326),
  "created_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"           TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "profiles_location_gix" ON "profiles" USING GIST ("location");
CREATE INDEX "profiles_looking_for_gin" ON "profiles" USING GIN ("looking_for");

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON "profiles"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.3 interests + profile_interests
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "interests" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"       TEXT NOT NULL UNIQUE,
  "label"      TEXT NOT NULL,
  "category"   TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TRIGGER interests_updated_at BEFORE UPDATE ON "interests"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE "profile_interests" (
  "profile_id"  UUID NOT NULL REFERENCES "profiles"("id")  ON DELETE CASCADE,
  "interest_id" UUID NOT NULL REFERENCES "interests"("id") ON DELETE CASCADE,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("profile_id", "interest_id")
);

CREATE INDEX "profile_interests_interest_id_idx" ON "profile_interests"("interest_id");

-- ─────────────────────────────────────────────────────────────
-- 3.4 prompts + profile_prompts
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "prompts" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "text"       TEXT NOT NULL,
  "active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TRIGGER prompts_updated_at BEFORE UPDATE ON "prompts"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE "profile_prompts" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id" UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "prompt_id"  UUID NOT NULL REFERENCES "prompts"("id")  ON DELETE RESTRICT,
  "answer"     VARCHAR(280) NOT NULL,
  "position"   INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("profile_id", "position")
);

CREATE INDEX "profile_prompts_profile_id_idx" ON "profile_prompts"("profile_id");

CREATE TRIGGER profile_prompts_updated_at BEFORE UPDATE ON "profile_prompts"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.5 photos
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "photos" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "profile_id"  UUID NOT NULL REFERENCES "profiles"("id") ON DELETE CASCADE,
  "user_id"     UUID NOT NULL REFERENCES "users"("id")    ON DELETE CASCADE,
  "s3_key"      TEXT NOT NULL,
  "position"    INTEGER NOT NULL,
  "is_main"     BOOLEAN NOT NULL DEFAULT FALSE,
  "nsfw_score"  DOUBLE PRECISION,
  "status"      "PhotoStatus" NOT NULL DEFAULT 'pending',
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("profile_id", "position")
);

CREATE INDEX "photos_profile_id_idx" ON "photos"("profile_id");

CREATE TRIGGER photos_updated_at BEFORE UPDATE ON "photos"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.6 verifications
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "verifications" (
  "id"               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"          UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "selfie_s3_key"    TEXT NOT NULL,
  "status"           "VerificationStatus" NOT NULL DEFAULT 'pending',
  "match_confidence" DOUBLE PRECISION,
  "reject_reason"    TEXT,
  "attempt"          INTEGER NOT NULL DEFAULT 1,
  "reviewed_by"      UUID,
  "created_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"       TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "verifications_user_status_idx" ON "verifications"("user_id", "status");

CREATE TRIGGER verifications_updated_at BEFORE UPDATE ON "verifications"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.10 cities
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "cities" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug"       TEXT NOT NULL UNIQUE,
  "name"       TEXT NOT NULL,
  "country"    TEXT NOT NULL,
  "center"     geography(Point, 4326),
  "radius_km"  INTEGER NOT NULL DEFAULT 50,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "cities_center_gix" ON "cities" USING GIST ("center");

CREATE TRIGGER cities_updated_at BEFORE UPDATE ON "cities"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.7 places
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "places" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "label"      TEXT NOT NULL,
  "kind"       TEXT NOT NULL,
  "vibe"       TEXT NOT NULL,
  "address"    TEXT NOT NULL,
  "location"   geography(Point, 4326),
  "icon"       TEXT NOT NULL,
  "tone"       TEXT NOT NULL,
  "hot"        BOOLEAN NOT NULL DEFAULT FALSE,
  "active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "city_id"    UUID NOT NULL REFERENCES "cities"("id") ON DELETE RESTRICT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "places_location_gix" ON "places" USING GIST ("location");
CREATE INDEX "places_city_id_idx"  ON "places"("city_id");
CREATE INDEX "places_active_idx"   ON "places"("active");

CREATE TRIGGER places_updated_at BEFORE UPDATE ON "places"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.8 events
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "events" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "title"      TEXT NOT NULL,
  "host"       TEXT NOT NULL,
  "vibe"       TEXT NOT NULL,
  "place_id"   UUID REFERENCES "places"("id") ON DELETE SET NULL,
  "location"   geography(Point, 4326),
  "starts_at"  TIMESTAMPTZ(6) NOT NULL,
  "ends_at"    TIMESTAMPTZ(6) NOT NULL,
  "door_text"  TEXT NOT NULL,
  "cover_text" TEXT NOT NULL,
  "city_id"    UUID NOT NULL REFERENCES "cities"("id") ON DELETE RESTRICT,
  "tags"       TEXT[] NOT NULL DEFAULT '{}',
  "icon"       TEXT NOT NULL,
  "tone"       TEXT NOT NULL,
  "hot"        BOOLEAN NOT NULL DEFAULT FALSE,
  "active"     BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "events_location_gix"        ON "events" USING GIST ("location");
CREATE INDEX "events_city_starts_at_idx"  ON "events"("city_id", "starts_at");
CREATE INDEX "events_starts_at_idx"       ON "events"("starts_at");

CREATE TRIGGER events_updated_at BEFORE UPDATE ON "events"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.9 checkins
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "checkins" (
  "id"             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"        UUID NOT NULL REFERENCES "users"("id")  ON DELETE CASCADE,
  "place_id"       UUID REFERENCES "places"("id") ON DELETE CASCADE,
  "event_id"       UUID REFERENCES "events"("id") ON DELETE CASCADE,
  "checked_in_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "expires_at"     TIMESTAMPTZ(6) NOT NULL,
  "device_lat"     DOUBLE PRECISION NOT NULL,
  "device_lng"     DOUBLE PRECISION NOT NULL,
  "left_at"        TIMESTAMPTZ(6),
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  -- exactly one of place_id / event_id must be set
  CHECK (("place_id" IS NOT NULL)::INT + ("event_id" IS NOT NULL)::INT = 1)
);

CREATE INDEX "checkins_user_left_idx"   ON "checkins"("user_id", "left_at");
CREATE INDEX "checkins_place_active_idx" ON "checkins"("place_id", "left_at", "expires_at");
CREATE INDEX "checkins_event_active_idx" ON "checkins"("event_id", "left_at", "expires_at");
-- a user can have at most one active check-in per spot/event at a time
CREATE UNIQUE INDEX "checkins_one_active_per_user_place"
  ON "checkins"("user_id", "place_id") WHERE "left_at" IS NULL AND "place_id" IS NOT NULL;
CREATE UNIQUE INDEX "checkins_one_active_per_user_event"
  ON "checkins"("user_id", "event_id") WHERE "left_at" IS NULL AND "event_id" IS NOT NULL;

CREATE TRIGGER checkins_updated_at BEFORE UPDATE ON "checkins"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.11 event_rsvps
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "event_rsvps" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL REFERENCES "users"("id")  ON DELETE CASCADE,
  "event_id"   UUID NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "status"     "RsvpStatus" NOT NULL DEFAULT 'going',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("user_id", "event_id")
);

CREATE INDEX "event_rsvps_event_status_idx" ON "event_rsvps"("event_id", "status");

CREATE TRIGGER event_rsvps_updated_at BEFORE UPDATE ON "event_rsvps"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.12 saved_spots + saved_events
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "saved_spots" (
  "user_id"    UUID NOT NULL REFERENCES "users"("id")  ON DELETE CASCADE,
  "place_id"   UUID NOT NULL REFERENCES "places"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("user_id", "place_id")
);

CREATE INDEX "saved_spots_place_id_idx" ON "saved_spots"("place_id");

CREATE TABLE "saved_events" (
  "user_id"    UUID NOT NULL REFERENCES "users"("id")  ON DELETE CASCADE,
  "event_id"   UUID NOT NULL REFERENCES "events"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("user_id", "event_id")
);

CREATE INDEX "saved_events_event_id_idx" ON "saved_events"("event_id");

-- ─────────────────────────────────────────────────────────────
-- 3.13 likes
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "likes" (
  "id"                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "from_user_id"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "to_user_id"        UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "anchor_type"       "LikeAnchorType" NOT NULL,
  "anchor_photo_id"   UUID REFERENCES "photos"("id")          ON DELETE SET NULL,
  "anchor_prompt_id"  UUID REFERENCES "profile_prompts"("id") ON DELETE SET NULL,
  "comment"           VARCHAR(140),
  "created_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("from_user_id", "to_user_id"),
  CHECK ("from_user_id" <> "to_user_id"),
  -- if anchor_type=photo then photo_id present; if prompt then prompt_id present
  CHECK (
    ("anchor_type" = 'photo'  AND "anchor_photo_id"  IS NOT NULL AND "anchor_prompt_id" IS NULL) OR
    ("anchor_type" = 'prompt' AND "anchor_prompt_id" IS NOT NULL AND "anchor_photo_id"  IS NULL)
  )
);

CREATE INDEX "likes_to_user_created_idx" ON "likes"("to_user_id", "created_at" DESC);
CREATE INDEX "likes_from_user_idx"       ON "likes"("from_user_id");

-- ─────────────────────────────────────────────────────────────
-- Passes (records skips so feed doesn't re-show)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "passes" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "from_user_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "to_user_id"   UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("from_user_id", "to_user_id"),
  CHECK ("from_user_id" <> "to_user_id")
);

CREATE INDEX "passes_from_user_idx" ON "passes"("from_user_id");

-- ─────────────────────────────────────────────────────────────
-- 3.14 matches  (sorted-pair uniqueness via CHECK)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "matches" (
  "id"              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_a_id"       UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "user_b_id"       UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "like_a_id"       UUID NOT NULL UNIQUE REFERENCES "likes"("id") ON DELETE CASCADE,
  "like_b_id"       UUID NOT NULL UNIQUE REFERENCES "likes"("id") ON DELETE CASCADE,
  "status"          "MatchStatus" NOT NULL DEFAULT 'active',
  "last_message_at" TIMESTAMPTZ(6),
  "unmatched_by"    UUID,
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("user_a_id", "user_b_id"),
  CHECK ("user_a_id" < "user_b_id")   -- sorted-pair invariant
);

CREATE INDEX "matches_user_a_status_last_idx" ON "matches"("user_a_id", "status", "last_message_at" DESC);
CREATE INDEX "matches_user_b_status_last_idx" ON "matches"("user_b_id", "status", "last_message_at" DESC);

CREATE TRIGGER matches_updated_at BEFORE UPDATE ON "matches"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.15 messages
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "messages" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "match_id"   UUID NOT NULL REFERENCES "matches"("id") ON DELETE CASCADE,
  "sender_id"  UUID NOT NULL REFERENCES "users"("id")    ON DELETE CASCADE,
  "body"       TEXT NOT NULL,
  "kind"       "MessageKind"   NOT NULL DEFAULT 'text',
  "status"     "MessageStatus" NOT NULL DEFAULT 'sent',
  "client_id"  TEXT NOT NULL,
  "read_at"    TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("match_id", "sender_id", "client_id")
);

CREATE INDEX "messages_match_created_idx" ON "messages"("match_id", "created_at");

-- ─────────────────────────────────────────────────────────────
-- 3.16 blocks + reports
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "blocks" (
  "blocker_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "blocked_id" UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  PRIMARY KEY ("blocker_id", "blocked_id"),
  CHECK ("blocker_id" <> "blocked_id")
);

CREATE INDEX "blocks_blocked_id_idx" ON "blocks"("blocked_id");

CREATE TABLE "reports" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "reporter_id"  UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "target_type"  "ReportTargetType" NOT NULL,
  "target_id"    UUID NOT NULL,
  "reason"       "ReportReason"     NOT NULL,
  "detail"       VARCHAR(280)       NOT NULL,
  "status"       "ReportStatus"     NOT NULL DEFAULT 'pending',
  "reviewed_by"  UUID,
  "review_note"  TEXT,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CHECK (CHAR_LENGTH(TRIM(detail)) >= 10)
);

CREATE INDEX "reports_status_created_idx" ON "reports"("status", "created_at" DESC);
CREATE INDEX "reports_reporter_id_idx"    ON "reports"("reporter_id");
CREATE INDEX "reports_target_idx"         ON "reports"("target_type", "target_id");

CREATE TRIGGER reports_updated_at BEFORE UPDATE ON "reports"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.17 emergency_contacts
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "emergency_contacts" (
  "id"                       UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"                  UUID NOT NULL UNIQUE REFERENCES "users"("id") ON DELETE CASCADE,
  "name"                     TEXT NOT NULL,
  "phone_e164"               TEXT NOT NULL,
  "auto_share_first_date"    BOOLEAN NOT NULL DEFAULT FALSE,
  "checkin_timer"            BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at"               TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"               TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TRIGGER emergency_contacts_updated_at BEFORE UPDATE ON "emergency_contacts"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.18 notifications + device_tokens
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "notifications" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "type"       TEXT NOT NULL,
  "payload"    JSONB NOT NULL,
  "read"       BOOLEAN NOT NULL DEFAULT FALSE,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "notifications_user_unread_idx" ON "notifications"("user_id", "read", "created_at" DESC);

CREATE TABLE "device_tokens" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "fcm_token"  TEXT NOT NULL,
  "platform"   "DevicePlatform" NOT NULL,
  "last_seen"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("user_id", "fcm_token")
);

CREATE TRIGGER device_tokens_updated_at BEFORE UPDATE ON "device_tokens"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.19 linked_accounts
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "linked_accounts" (
  "id"           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"      UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "provider"     "LinkedProvider" NOT NULL,
  "handle"       TEXT NOT NULL,
  "data"         JSONB,
  "connected_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  UNIQUE ("user_id", "provider")
);

CREATE TRIGGER linked_accounts_updated_at BEFORE UPDATE ON "linked_accounts"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- 3.20 user_settings
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "user_settings" (
  "user_id"             UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "notify_matches"      BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_messages"     BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_likes"        BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_places"       BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_events"       BOOLEAN NOT NULL DEFAULT TRUE,
  "notify_news"         BOOLEAN NOT NULL DEFAULT FALSE,
  "email_digest"        BOOLEAN NOT NULL DEFAULT FALSE,
  "quiet_hours_start"   INTEGER CHECK (quiet_hours_start BETWEEN 0 AND 23),
  "quiet_hours_end"     INTEGER CHECK (quiet_hours_end   BETWEEN 0 AND 23),
  "read_receipts"       BOOLEAN NOT NULL DEFAULT TRUE,
  "active_status"       BOOLEAN NOT NULL DEFAULT TRUE,
  "blur_explicit"       BOOLEAN NOT NULL DEFAULT TRUE,
  "show_me_on_places"   BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TRIGGER user_settings_updated_at BEFORE UPDATE ON "user_settings"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Filters (per-user discovery filters)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "filters" (
  "user_id"           UUID PRIMARY KEY REFERENCES "users"("id") ON DELETE CASCADE,
  "looking_for"       TEXT[] NOT NULL DEFAULT '{}',
  "relationship"      TEXT[] NOT NULL DEFAULT '{}',
  "drinks"            TEXT[] NOT NULL DEFAULT '{}',
  "smokes"            TEXT[] NOT NULL DEFAULT '{}',
  "exercise"          TEXT[] NOT NULL DEFAULT '{}',
  "weed_420"          TEXT[] NOT NULL DEFAULT '{}',
  "kids"              TEXT[] NOT NULL DEFAULT '{}',
  "politics"          TEXT[] NOT NULL DEFAULT '{}',
  "religion"          TEXT[] NOT NULL DEFAULT '{}',
  "monogamy"          TEXT[] NOT NULL DEFAULT '{}',
  "star_sign"         TEXT[] NOT NULL DEFAULT '{}',
  "interests"         TEXT[] NOT NULL DEFAULT '{}',
  "age_min"           INTEGER NOT NULL DEFAULT 18 CHECK (age_min >= 18),
  "age_max"           INTEGER NOT NULL DEFAULT 99 CHECK (age_max <= 120),
  "height_min_cm"     INTEGER NOT NULL DEFAULT 120,
  "height_max_cm"     INTEGER NOT NULL DEFAULT 220,
  "distance_mi"       INTEGER NOT NULL DEFAULT 25 CHECK (distance_mi BETWEEN 1 AND 500),
  "show_me_on_places" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  CHECK (age_min <= age_max),
  CHECK (height_min_cm <= height_max_cm)
);

CREATE TRIGGER filters_updated_at BEFORE UPDATE ON "filters"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- Auth — refresh tokens
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "refresh_tokens" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"    UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token_hash" TEXT NOT NULL UNIQUE,
  "family"     TEXT NOT NULL,
  "parent_id"  UUID,
  "user_agent" TEXT,
  "ip"         TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_family_idx"  ON "refresh_tokens"("family");

-- ─────────────────────────────────────────────────────────────
-- Auth — OTP attempts
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "otp_attempts" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     UUID REFERENCES "users"("id") ON DELETE CASCADE,
  "phone_e164"  TEXT NOT NULL,
  "success"     BOOLEAN NOT NULL DEFAULT FALSE,
  "ip"          TEXT,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "otp_attempts_phone_created_idx" ON "otp_attempts"("phone_e164", "created_at" DESC);

-- ─────────────────────────────────────────────────────────────
-- Place requests (user-suggested venues)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "place_requests" (
  "id"          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "user_id"     UUID NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "label"       TEXT NOT NULL,
  "address"     TEXT,
  "detail"      TEXT NOT NULL,
  "status"      "PlaceRequestStatus" NOT NULL DEFAULT 'pending',
  "reviewed_by" UUID,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "place_requests_status_created_idx" ON "place_requests"("status", "created_at" DESC);

CREATE TRIGGER place_requests_updated_at BEFORE UPDATE ON "place_requests"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─────────────────────────────────────────────────────────────
-- §9 Admin tables
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "admin_users" (
  "id"            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "email"         TEXT NOT NULL UNIQUE,
  "password_hash" TEXT NOT NULL,
  "role"          "AdminRole" NOT NULL DEFAULT 'moderator',
  "last_login_at" TIMESTAMPTZ(6),
  "created_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW(),
  "updated_at"    TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TRIGGER admin_users_updated_at BEFORE UPDATE ON "admin_users"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE "admin_audit" (
  "id"         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "admin_id"   UUID NOT NULL REFERENCES "admin_users"("id") ON DELETE CASCADE,
  "action"     TEXT NOT NULL,
  "target"     TEXT NOT NULL,
  "before"     JSONB,
  "after"      JSONB,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE INDEX "admin_audit_admin_created_idx" ON "admin_audit"("admin_id", "created_at" DESC);
CREATE INDEX "admin_audit_target_idx"        ON "admin_audit"("target");

-- ─────────────────────────────────────────────────────────────
-- Feed-weight config (singleton row, id=1)
-- ─────────────────────────────────────────────────────────────

CREATE TABLE "feed_config" (
  "id"                          INTEGER PRIMARY KEY CHECK (id = 1),
  "w_recency"                   DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  "w_mutual_interests"          DOUBLE PRECISION NOT NULL DEFAULT 0.20,
  "w_same_spot"                 DOUBLE PRECISION NOT NULL DEFAULT 0.20,
  "w_distance"                  DOUBLE PRECISION NOT NULL DEFAULT 0.15,
  "w_reciprocal"                DOUBLE PRECISION NOT NULL DEFAULT 0.15,
  "w_recently_shown_penalty"    DOUBLE PRECISION NOT NULL DEFAULT 0.05,
  "updated_at"                  TIMESTAMPTZ(6) NOT NULL DEFAULT NOW()
);

CREATE TRIGGER feed_config_updated_at BEFORE UPDATE ON "feed_config"
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Insert the singleton row
INSERT INTO "feed_config" ("id") VALUES (1);
