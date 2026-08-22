-- Hey — Postgres init migration (Sprint 9).
--
-- Full ship-scope schema for PostgreSQL (Neon-compatible).
-- Migrated back from MySQL in Sprint 9 because Hostinger's Node.js
-- tier can't reliably reach raw-TCP MySQL. Neon exposes Postgres
-- over WebSocket on port 443 which Hostinger can reach.
--
-- PostGIS enabled for the profiles.location geography column.

CREATE EXTENSION IF NOT EXISTS postgis;

-- ── enums ─────────────────────────────────────────────────────
CREATE TYPE "UserStatus"         AS ENUM ('onboarding','active','paused','hidden','banned','deleted');
CREATE TYPE "Visibility"         AS ENUM ('everyone','liked_only');
CREATE TYPE "Gender"             AS ENUM ('woman','man','non_binary','trans_woman','trans_man','genderfluid','other');
CREATE TYPE "RelationshipIntent" AS ENUM ('longterm','longterm_open','short_open','short','figuring_out','friends');
CREATE TYPE "StarSign"           AS ENUM ('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces');
CREATE TYPE "Drinks"             AS ENUM ('often','socially','rarely','never');
CREATE TYPE "Smokes"             AS ENUM ('regularly','socially','trying_to_quit','never');
CREATE TYPE "Exercise"           AS ENUM ('daily','few_week','sometimes','never');
CREATE TYPE "Weed420"            AS ENUM ('yes','sometimes','never');
CREATE TYPE "Kids"               AS ENUM ('want','have_want_more','have_done','dont_want','open','not_sure');
CREATE TYPE "Politics"           AS ENUM ('left','moderate','right','not_political','rather_not_say');
CREATE TYPE "Religion"           AS ENUM ('agnostic','atheist','christian','jewish','muslim','hindu','buddhist','spiritual','other');
CREATE TYPE "Monogamy"           AS ENUM ('monogamous','monogamish','non_monogamous','figuring');
CREATE TYPE "PhotoStatus"        AS ENUM ('pending','approved','rejected');
CREATE TYPE "LikeAnchorType"     AS ENUM ('photo','prompt');
CREATE TYPE "MatchStatus"        AS ENUM ('active','unmatched','expired');
CREATE TYPE "MessageKind"        AS ENUM ('text','place_share','location_share','system');
CREATE TYPE "MessageStatus"      AS ENUM ('sent','delivered','read','failed');
CREATE TYPE "ReportTargetType"   AS ENUM ('profile');
CREATE TYPE "ReportReason"       AS ENUM ('fake','inappropriate','harassment','spam','underage','scam','other');
CREATE TYPE "ReportStatus"       AS ENUM ('pending','reviewed','actioned','dismissed');
CREATE TYPE "DevicePlatform"     AS ENUM ('ios','android','web');
CREATE TYPE "LinkedProvider"     AS ENUM ('instagram','spotify');

-- ── users ─────────────────────────────────────────────────────
CREATE TABLE "users" (
  "id"             UUID          NOT NULL,
  "phone_e164"     TEXT          NOT NULL,
  "country_code"   TEXT          NOT NULL,
  "email"          TEXT,
  "password_hash"  TEXT,
  "dob"            DATE,
  "status"         "UserStatus"  NOT NULL DEFAULT 'onboarding',
  "visibility"     "Visibility"  NOT NULL DEFAULT 'everyone',
  "auto_resume_at" TIMESTAMPTZ(6),
  "last_active_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "age_confirmed"  BOOLEAN       NOT NULL DEFAULT false,
  "created_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"     TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deleted_at"     TIMESTAMPTZ(6),
  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_phone_e164_key" ON "users"("phone_e164");
CREATE UNIQUE INDEX "users_email_key"      ON "users"("email");
CREATE INDEX "users_phone_e164_idx"    ON "users"("phone_e164");
CREATE INDEX "users_status_idx"        ON "users"("status");
CREATE INDEX "users_last_active_at_idx" ON "users"("last_active_at");

-- ── profiles (with PostGIS location) ─────────────────────────
CREATE TABLE "profiles" (
  "id"                  UUID                        NOT NULL,
  "user_id"             UUID                        NOT NULL,
  "name"                TEXT,
  "gender"              "Gender",
  "gender_custom"       TEXT,
  "looking_for"         TEXT[]                      NOT NULL DEFAULT '{}',
  "relationship_intent" "RelationshipIntent",
  "height_cm"           INTEGER,
  "bio"                 VARCHAR(180),
  "job"                 TEXT,
  "school"              TEXT,
  "pronouns"            TEXT,
  "star_sign"           "StarSign",
  "drinks"              "Drinks",
  "smokes"              "Smokes",
  "exercise"            "Exercise",
  "weed_420"            "Weed420",
  "kids"                "Kids",
  "politics"            "Politics",
  "religion"            "Religion",
  "monogamy"            "Monogamy",
  "completion_pct"      INTEGER                     NOT NULL DEFAULT 0,
  "location"            geography(Point, 4326),
  "created_at"          TIMESTAMPTZ(6)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMPTZ(6)              NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");
CREATE INDEX "profiles_location_idx" ON "profiles" USING GIST ("location");
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_user_id_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── interests + profile_interests ────────────────────────────
CREATE TABLE "interests" (
  "id"         UUID           NOT NULL,
  "slug"       TEXT           NOT NULL,
  "label"      TEXT           NOT NULL,
  "category"   TEXT           NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "interests_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "interests_slug_key" ON "interests"("slug");

CREATE TABLE "profile_interests" (
  "profile_id"  UUID           NOT NULL,
  "interest_id" UUID           NOT NULL,
  "created_at"  TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profile_interests_pkey" PRIMARY KEY ("profile_id","interest_id")
);
ALTER TABLE "profile_interests" ADD CONSTRAINT "profile_interests_profile_fk"
  FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_interests" ADD CONSTRAINT "profile_interests_interest_fk"
  FOREIGN KEY ("interest_id") REFERENCES "interests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── prompts + profile_prompts ────────────────────────────────
CREATE TABLE "prompts" (
  "id"         UUID           NOT NULL,
  "text"       TEXT           NOT NULL,
  "active"     BOOLEAN        NOT NULL DEFAULT true,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "prompts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "profile_prompts" (
  "id"         UUID           NOT NULL,
  "profile_id" UUID           NOT NULL,
  "prompt_id"  UUID           NOT NULL,
  "answer"     VARCHAR(280)   NOT NULL,
  "position"   INTEGER        NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "profile_prompts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "profile_prompts_profile_position_key" ON "profile_prompts"("profile_id","position");
CREATE INDEX "profile_prompts_profile_id_idx" ON "profile_prompts"("profile_id");
ALTER TABLE "profile_prompts" ADD CONSTRAINT "profile_prompts_profile_fk"
  FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "profile_prompts" ADD CONSTRAINT "profile_prompts_prompt_fk"
  FOREIGN KEY ("prompt_id") REFERENCES "prompts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- ── photos ───────────────────────────────────────────────────
CREATE TABLE "photos" (
  "id"         UUID           NOT NULL,
  "profile_id" UUID           NOT NULL,
  "user_id"    UUID           NOT NULL,
  "s3_key"     TEXT           NOT NULL,
  "position"   INTEGER        NOT NULL,
  "is_main"    BOOLEAN        NOT NULL DEFAULT false,
  "nsfw_score" DOUBLE PRECISION,
  "status"     "PhotoStatus"  NOT NULL DEFAULT 'pending',
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "photos_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "photos_profile_position_key" ON "photos"("profile_id","position");
CREATE INDEX "photos_profile_id_idx" ON "photos"("profile_id");
ALTER TABLE "photos" ADD CONSTRAINT "photos_profile_fk"
  FOREIGN KEY ("profile_id") REFERENCES "profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "photos" ADD CONSTRAINT "photos_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── likes + passes ───────────────────────────────────────────
CREATE TABLE "likes" (
  "id"               UUID              NOT NULL,
  "from_user_id"     UUID              NOT NULL,
  "to_user_id"       UUID              NOT NULL,
  "anchor_type"      "LikeAnchorType"  NOT NULL,
  "anchor_photo_id"  UUID,
  "anchor_prompt_id" UUID,
  "comment"          VARCHAR(140),
  "created_at"       TIMESTAMPTZ(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "likes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "likes_from_to_key"   ON "likes"("from_user_id","to_user_id");
CREATE INDEX "likes_to_created_idx" ON "likes"("to_user_id","created_at");
ALTER TABLE "likes" ADD CONSTRAINT "likes_from_fk"
  FOREIGN KEY ("from_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "likes_to_fk"
  FOREIGN KEY ("to_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "likes_photo_fk"
  FOREIGN KEY ("anchor_photo_id") REFERENCES "photos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "likes" ADD CONSTRAINT "likes_prompt_fk"
  FOREIGN KEY ("anchor_prompt_id") REFERENCES "profile_prompts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE "passes" (
  "id"           UUID           NOT NULL,
  "from_user_id" UUID           NOT NULL,
  "to_user_id"   UUID           NOT NULL,
  "created_at"   TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "passes_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "passes_from_to_key" ON "passes"("from_user_id","to_user_id");

-- ── matches ──────────────────────────────────────────────────
CREATE TABLE "matches" (
  "id"              UUID           NOT NULL,
  "user_a_id"       UUID           NOT NULL,
  "user_b_id"       UUID           NOT NULL,
  "like_a_id"       UUID           NOT NULL,
  "like_b_id"       UUID           NOT NULL,
  "status"          "MatchStatus"  NOT NULL DEFAULT 'active',
  "last_message_at" TIMESTAMPTZ(6),
  "unmatched_by"    UUID,
  "created_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"      TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "matches_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "matches_like_a_key" ON "matches"("like_a_id");
CREATE UNIQUE INDEX "matches_like_b_key" ON "matches"("like_b_id");
CREATE UNIQUE INDEX "matches_pair_key"  ON "matches"("user_a_id","user_b_id");
CREATE INDEX "matches_a_status_lm_idx" ON "matches"("user_a_id","status","last_message_at");
CREATE INDEX "matches_b_status_lm_idx" ON "matches"("user_b_id","status","last_message_at");
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_a_fk"
  FOREIGN KEY ("user_a_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_user_b_fk"
  FOREIGN KEY ("user_b_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_like_a_fk"
  FOREIGN KEY ("like_a_id") REFERENCES "likes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "matches" ADD CONSTRAINT "matches_like_b_fk"
  FOREIGN KEY ("like_b_id") REFERENCES "likes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── messages ─────────────────────────────────────────────────
CREATE TABLE "messages" (
  "id"         UUID              NOT NULL,
  "match_id"   UUID              NOT NULL,
  "sender_id"  UUID              NOT NULL,
  "body"       TEXT              NOT NULL,
  "kind"       "MessageKind"     NOT NULL DEFAULT 'text',
  "status"     "MessageStatus"   NOT NULL DEFAULT 'sent',
  "client_id"  TEXT              NOT NULL,
  "read_at"    TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "messages_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "messages_client_idem_key" ON "messages"("match_id","sender_id","client_id");
CREATE INDEX "messages_match_created_idx" ON "messages"("match_id","created_at");
ALTER TABLE "messages" ADD CONSTRAINT "messages_match_fk"
  FOREIGN KEY ("match_id") REFERENCES "matches"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "messages" ADD CONSTRAINT "messages_sender_fk"
  FOREIGN KEY ("sender_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── blocks + reports ─────────────────────────────────────────
CREATE TABLE "blocks" (
  "blocker_id" UUID           NOT NULL,
  "blocked_id" UUID           NOT NULL,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "blocks_pkey" PRIMARY KEY ("blocker_id","blocked_id")
);
CREATE INDEX "blocks_blocked_idx" ON "blocks"("blocked_id");
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocker_fk"
  FOREIGN KEY ("blocker_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "blocks" ADD CONSTRAINT "blocks_blocked_fk"
  FOREIGN KEY ("blocked_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "reports" (
  "id"          UUID                NOT NULL,
  "reporter_id" UUID                NOT NULL,
  "target_type" "ReportTargetType"  NOT NULL,
  "target_id"   UUID                NOT NULL,
  "reason"      "ReportReason"      NOT NULL,
  "detail"      VARCHAR(280)        NOT NULL,
  "status"      "ReportStatus"      NOT NULL DEFAULT 'pending',
  "reviewed_by" UUID,
  "review_note" TEXT,
  "created_at"  TIMESTAMPTZ(6)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"  TIMESTAMPTZ(6)      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "reports_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "reports_detail_len_chk" CHECK (CHAR_LENGTH(TRIM("detail")) >= 10)
);
CREATE INDEX "reports_status_created_idx" ON "reports"("status","created_at");
CREATE INDEX "reports_reporter_idx"       ON "reports"("reporter_id");
CREATE INDEX "reports_target_idx"         ON "reports"("target_type","target_id");
ALTER TABLE "reports" ADD CONSTRAINT "reports_reporter_fk"
  FOREIGN KEY ("reporter_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── emergency_contacts ───────────────────────────────────────
CREATE TABLE "emergency_contacts" (
  "id"                     UUID           NOT NULL,
  "user_id"                UUID           NOT NULL,
  "name"                   TEXT           NOT NULL,
  "phone_e164"             TEXT           NOT NULL,
  "auto_share_first_date"  BOOLEAN        NOT NULL DEFAULT false,
  "checkin_timer"          BOOLEAN        NOT NULL DEFAULT false,
  "created_at"             TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"             TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "emergency_contacts_user_key" ON "emergency_contacts"("user_id");
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── notifications + device_tokens ────────────────────────────
CREATE TABLE "notifications" (
  "id"         UUID           NOT NULL,
  "user_id"    UUID           NOT NULL,
  "type"       TEXT           NOT NULL,
  "payload"    JSONB          NOT NULL,
  "read"       BOOLEAN        NOT NULL DEFAULT false,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "notifications_user_read_created_idx" ON "notifications"("user_id","read","created_at");
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "device_tokens" (
  "id"         UUID              NOT NULL,
  "user_id"    UUID              NOT NULL,
  "fcm_token"  TEXT              NOT NULL,
  "platform"   "DevicePlatform"  NOT NULL,
  "last_seen"  TIMESTAMPTZ(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "created_at" TIMESTAMPTZ(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "device_tokens_user_fcm_key" ON "device_tokens"("user_id","fcm_token");
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── linked_accounts ──────────────────────────────────────────
CREATE TABLE "linked_accounts" (
  "id"           UUID              NOT NULL,
  "user_id"      UUID              NOT NULL,
  "provider"     "LinkedProvider"  NOT NULL,
  "handle"       TEXT              NOT NULL,
  "data"         JSONB,
  "connected_at" TIMESTAMPTZ(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"   TIMESTAMPTZ(6)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "linked_accounts_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "linked_accounts_user_provider_key" ON "linked_accounts"("user_id","provider");
ALTER TABLE "linked_accounts" ADD CONSTRAINT "linked_accounts_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── user_settings ────────────────────────────────────────────
CREATE TABLE "user_settings" (
  "user_id"             UUID           NOT NULL,
  "notify_matches"      BOOLEAN        NOT NULL DEFAULT true,
  "notify_messages"     BOOLEAN        NOT NULL DEFAULT true,
  "notify_likes"        BOOLEAN        NOT NULL DEFAULT true,
  "notify_places"       BOOLEAN        NOT NULL DEFAULT true,   -- vestigial
  "notify_events"       BOOLEAN        NOT NULL DEFAULT true,   -- vestigial
  "notify_news"         BOOLEAN        NOT NULL DEFAULT false,
  "email_digest"        BOOLEAN        NOT NULL DEFAULT false,
  "quiet_hours_start"   INTEGER,
  "quiet_hours_end"     INTEGER,
  "read_receipts"       BOOLEAN        NOT NULL DEFAULT true,
  "active_status"       BOOLEAN        NOT NULL DEFAULT true,
  "blur_explicit"       BOOLEAN        NOT NULL DEFAULT true,
  "show_me_on_places"   BOOLEAN        NOT NULL DEFAULT true,   -- vestigial
  "created_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"          TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "user_settings_pkey" PRIMARY KEY ("user_id")
);
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── filters ──────────────────────────────────────────────────
CREATE TABLE "filters" (
  "user_id"           UUID           NOT NULL,
  "looking_for"       TEXT[]         NOT NULL DEFAULT '{}',
  "relationship"      TEXT[]         NOT NULL DEFAULT '{}',
  "drinks"            TEXT[]         NOT NULL DEFAULT '{}',
  "smokes"            TEXT[]         NOT NULL DEFAULT '{}',
  "exercise"          TEXT[]         NOT NULL DEFAULT '{}',
  "weed_420"          TEXT[]         NOT NULL DEFAULT '{}',
  "kids"              TEXT[]         NOT NULL DEFAULT '{}',
  "politics"          TEXT[]         NOT NULL DEFAULT '{}',
  "religion"          TEXT[]         NOT NULL DEFAULT '{}',
  "monogamy"          TEXT[]         NOT NULL DEFAULT '{}',
  "star_sign"         TEXT[]         NOT NULL DEFAULT '{}',
  "interests"         TEXT[]         NOT NULL DEFAULT '{}',
  "age_min"           INTEGER        NOT NULL DEFAULT 18,
  "age_max"           INTEGER        NOT NULL DEFAULT 99,
  "height_min_cm"     INTEGER        NOT NULL DEFAULT 120,
  "height_max_cm"     INTEGER        NOT NULL DEFAULT 220,
  "distance_mi"       INTEGER        NOT NULL DEFAULT 25,
  "show_me_on_places" BOOLEAN        NOT NULL DEFAULT true,   -- vestigial
  "created_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at"        TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "filters_pkey" PRIMARY KEY ("user_id")
);
ALTER TABLE "filters" ADD CONSTRAINT "filters_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── refresh_tokens ───────────────────────────────────────────
CREATE TABLE "refresh_tokens" (
  "id"         UUID           NOT NULL,
  "user_id"    UUID           NOT NULL,
  "token_hash" TEXT           NOT NULL,
  "family"     TEXT           NOT NULL,
  "parent_id"  UUID,
  "user_agent" TEXT,
  "ip"         TEXT,
  "expires_at" TIMESTAMPTZ(6) NOT NULL,
  "revoked_at" TIMESTAMPTZ(6),
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "refresh_tokens_token_hash_key" ON "refresh_tokens"("token_hash");
CREATE INDEX "refresh_tokens_user_idx"   ON "refresh_tokens"("user_id");
CREATE INDEX "refresh_tokens_family_idx" ON "refresh_tokens"("family");
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── otp_attempts ─────────────────────────────────────────────
CREATE TABLE "otp_attempts" (
  "id"         UUID           NOT NULL,
  "user_id"    UUID,
  "phone_e164" TEXT           NOT NULL,
  "success"    BOOLEAN        NOT NULL DEFAULT false,
  "ip"         TEXT,
  "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "otp_attempts_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "otp_attempts_phone_created_idx" ON "otp_attempts"("phone_e164","created_at");
ALTER TABLE "otp_attempts" ADD CONSTRAINT "otp_attempts_user_fk"
  FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── feed_config (singleton) ──────────────────────────────────
CREATE TABLE "feed_config" (
  "id"                        INTEGER          NOT NULL DEFAULT 1,
  "w_recency"                 DOUBLE PRECISION NOT NULL DEFAULT 0.30,
  "w_mutual_interests"        DOUBLE PRECISION NOT NULL DEFAULT 0.25,
  "w_distance"                DOUBLE PRECISION NOT NULL DEFAULT 0.20,
  "w_reciprocal"              DOUBLE PRECISION NOT NULL DEFAULT 0.20,
  "w_recently_shown_penalty"  DOUBLE PRECISION NOT NULL DEFAULT 0.05,
  "updated_at"                TIMESTAMPTZ(6)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "feed_config_pkey" PRIMARY KEY ("id")
);
INSERT INTO "feed_config" ("id") VALUES (1);
