-- Hey — MySQL 8 init migration (Sprint 3).
--
-- Recreates the ship-scope schema for MySQL after retiring PostgreSQL/PostGIS.
-- Enums live inline (MySQL ENUM), arrays live as JSON, `location` is a
-- POINT column defined here (Prisma doesn't model spatial types).
--
-- All tables use utf8mb4 + utf8mb4_0900_ai_ci to match Hostinger's default.

-- ── users ─────────────────────────────────────────────────────
CREATE TABLE `users` (
  `id`               CHAR(36)     NOT NULL,
  `phone_e164`       VARCHAR(32)  NOT NULL,
  `country_code`     VARCHAR(4)   NOT NULL,
  `email`            VARCHAR(255) NULL,
  `password_hash`    VARCHAR(255) NULL,
  `dob`              DATE         NULL,
  `status`           ENUM('onboarding','active','paused','hidden','banned','deleted') NOT NULL DEFAULT 'onboarding',
  `visibility`       ENUM('everyone','liked_only') NOT NULL DEFAULT 'everyone',
  `auto_resume_at`   TIMESTAMP(6) NULL,
  `last_active_at`   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `age_confirmed`    BOOLEAN      NOT NULL DEFAULT FALSE,
  `created_at`       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  `deleted_at`       TIMESTAMP(6) NULL,

  PRIMARY KEY (`id`),
  UNIQUE KEY `users_phone_e164_key` (`phone_e164`),
  UNIQUE KEY `users_email_key` (`email`),
  INDEX `users_phone_e164_idx` (`phone_e164`),
  INDEX `users_status_idx` (`status`),
  INDEX `users_last_active_at_idx` (`last_active_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── profiles ─────────────────────────────────────────────────
CREATE TABLE `profiles` (
  `id`                    CHAR(36)     NOT NULL,
  `user_id`               CHAR(36)     NOT NULL,
  `name`                  VARCHAR(80)  NULL,
  `gender`                ENUM('woman','man','non_binary','trans_woman','trans_man','genderfluid','other') NULL,
  `gender_custom`         VARCHAR(80)  NULL,
  `looking_for`           JSON         NOT NULL,
  `relationship_intent`   ENUM('longterm','longterm_open','short_open','short','figuring_out','friends') NULL,
  `height_cm`             INT          NULL,
  `bio`                   VARCHAR(180) NULL,
  `job`                   VARCHAR(120) NULL,
  `school`                VARCHAR(120) NULL,
  `pronouns`              VARCHAR(40)  NULL,
  `star_sign`             ENUM('aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces') NULL,
  `drinks`                ENUM('often','socially','rarely','never') NULL,
  `smokes`                ENUM('regularly','socially','trying_to_quit','never') NULL,
  `exercise`              ENUM('daily','few_week','sometimes','never') NULL,
  `weed_420`              ENUM('yes','sometimes','never') NULL,
  `kids`                  ENUM('want','have_want_more','have_done','dont_want','open','not_sure') NULL,
  `politics`              ENUM('left','moderate','right','not_political','rather_not_say') NULL,
  `religion`              ENUM('agnostic','atheist','christian','jewish','muslim','hindu','buddhist','spiritual','other') NULL,
  `monogamy`              ENUM('monogamous','monogamish','non_monogamous','figuring') NULL,
  `completion_pct`        INT          NOT NULL DEFAULT 0,
  `location`              POINT        NULL, -- SRID 0, treated as (lng, lat) via ST_Distance_Sphere
  `created_at`            TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`            TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),

  PRIMARY KEY (`id`),
  UNIQUE KEY `profiles_user_id_key` (`user_id`),
  CONSTRAINT `profiles_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── interests + profile_interests ────────────────────────────
CREATE TABLE `interests` (
  `id`         CHAR(36)     NOT NULL,
  `slug`       VARCHAR(64)  NOT NULL,
  `label`      VARCHAR(80)  NOT NULL,
  `category`   VARCHAR(40)  NOT NULL,
  `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `interests_slug_key` (`slug`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `profile_interests` (
  `profile_id`  CHAR(36)     NOT NULL,
  `interest_id` CHAR(36)     NOT NULL,
  `created_at`  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`profile_id`, `interest_id`),
  CONSTRAINT `profile_interests_profile_fk`  FOREIGN KEY (`profile_id`)  REFERENCES `profiles`(`id`)  ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `profile_interests_interest_fk` FOREIGN KEY (`interest_id`) REFERENCES `interests`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── prompts + profile_prompts ────────────────────────────────
CREATE TABLE `prompts` (
  `id`         CHAR(36)     NOT NULL,
  `text`       VARCHAR(140) NOT NULL,
  `active`     BOOLEAN      NOT NULL DEFAULT TRUE,
  `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `profile_prompts` (
  `id`         CHAR(36)     NOT NULL,
  `profile_id` CHAR(36)     NOT NULL,
  `prompt_id`  CHAR(36)     NOT NULL,
  `answer`     VARCHAR(280) NOT NULL,
  `position`   INT          NOT NULL DEFAULT 0,
  `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `profile_prompts_profile_position_key` (`profile_id`, `position`),
  INDEX `profile_prompts_profile_id_idx` (`profile_id`),
  CONSTRAINT `profile_prompts_profile_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `profile_prompts_prompt_fk`  FOREIGN KEY (`prompt_id`)  REFERENCES `prompts`(`id`)  ON DELETE RESTRICT ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── photos ───────────────────────────────────────────────────
CREATE TABLE `photos` (
  `id`         CHAR(36)     NOT NULL,
  `profile_id` CHAR(36)     NOT NULL,
  `user_id`    CHAR(36)     NOT NULL,
  `s3_key`     VARCHAR(255) NOT NULL,
  `position`   INT          NOT NULL,
  `is_main`    BOOLEAN      NOT NULL DEFAULT FALSE,
  `nsfw_score` DOUBLE       NULL,
  `status`     ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `photos_profile_position_key` (`profile_id`, `position`),
  INDEX `photos_profile_id_idx` (`profile_id`),
  CONSTRAINT `photos_profile_fk` FOREIGN KEY (`profile_id`) REFERENCES `profiles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `photos_user_fk`    FOREIGN KEY (`user_id`)    REFERENCES `users`(`id`)    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── likes + passes ───────────────────────────────────────────
CREATE TABLE `likes` (
  `id`               CHAR(36)     NOT NULL,
  `from_user_id`     CHAR(36)     NOT NULL,
  `to_user_id`       CHAR(36)     NOT NULL,
  `anchor_type`      ENUM('photo','prompt') NOT NULL,
  `anchor_photo_id`  CHAR(36)     NULL,
  `anchor_prompt_id` CHAR(36)     NULL,
  `comment`          VARCHAR(140) NULL,
  `created_at`       TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `likes_from_to_key` (`from_user_id`, `to_user_id`),
  INDEX `likes_to_created_idx` (`to_user_id`, `created_at`),
  CONSTRAINT `likes_from_fk`    FOREIGN KEY (`from_user_id`)     REFERENCES `users`(`id`)          ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `likes_to_fk`      FOREIGN KEY (`to_user_id`)       REFERENCES `users`(`id`)          ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `likes_photo_fk`   FOREIGN KEY (`anchor_photo_id`)  REFERENCES `photos`(`id`)         ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT `likes_prompt_fk`  FOREIGN KEY (`anchor_prompt_id`) REFERENCES `profile_prompts`(`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `passes` (
  `id`           CHAR(36)     NOT NULL,
  `from_user_id` CHAR(36)     NOT NULL,
  `to_user_id`   CHAR(36)     NOT NULL,
  `created_at`   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `passes_from_to_key` (`from_user_id`, `to_user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── matches ──────────────────────────────────────────────────
CREATE TABLE `matches` (
  `id`              CHAR(36)     NOT NULL,
  `user_a_id`       CHAR(36)     NOT NULL,
  `user_b_id`       CHAR(36)     NOT NULL,
  `like_a_id`       CHAR(36)     NOT NULL,
  `like_b_id`       CHAR(36)     NOT NULL,
  `status`          ENUM('active','unmatched','expired') NOT NULL DEFAULT 'active',
  `last_message_at` TIMESTAMP(6) NULL,
  `unmatched_by`    CHAR(36)     NULL,
  `created_at`      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`      TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `matches_like_a_key` (`like_a_id`),
  UNIQUE KEY `matches_like_b_key` (`like_b_id`),
  UNIQUE KEY `matches_pair_key`  (`user_a_id`, `user_b_id`),
  INDEX `matches_a_status_lm_idx` (`user_a_id`, `status`, `last_message_at`),
  INDEX `matches_b_status_lm_idx` (`user_b_id`, `status`, `last_message_at`),
  CONSTRAINT `matches_user_a_fk` FOREIGN KEY (`user_a_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `matches_user_b_fk` FOREIGN KEY (`user_b_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `matches_like_a_fk` FOREIGN KEY (`like_a_id`) REFERENCES `likes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `matches_like_b_fk` FOREIGN KEY (`like_b_id`) REFERENCES `likes`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── messages ─────────────────────────────────────────────────
CREATE TABLE `messages` (
  `id`         CHAR(36)     NOT NULL,
  `match_id`   CHAR(36)     NOT NULL,
  `sender_id`  CHAR(36)     NOT NULL,
  `body`       TEXT         NOT NULL,
  `kind`       ENUM('text','place_share','location_share','system') NOT NULL DEFAULT 'text',
  `status`     ENUM('sent','delivered','read','failed') NOT NULL DEFAULT 'sent',
  `client_id`  VARCHAR(64)  NOT NULL,
  `read_at`    TIMESTAMP(6) NULL,
  `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `messages_client_idem_key` (`match_id`, `sender_id`, `client_id`),
  INDEX `messages_match_created_idx` (`match_id`, `created_at`),
  CONSTRAINT `messages_match_fk`  FOREIGN KEY (`match_id`)  REFERENCES `matches`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `messages_sender_fk` FOREIGN KEY (`sender_id`) REFERENCES `users`(`id`)   ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── blocks + reports ─────────────────────────────────────────
CREATE TABLE `blocks` (
  `blocker_id` CHAR(36)     NOT NULL,
  `blocked_id` CHAR(36)     NOT NULL,
  `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`blocker_id`, `blocked_id`),
  INDEX `blocks_blocked_idx` (`blocked_id`),
  CONSTRAINT `blocks_blocker_fk` FOREIGN KEY (`blocker_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `blocks_blocked_fk` FOREIGN KEY (`blocked_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `reports` (
  `id`          CHAR(36)     NOT NULL,
  `reporter_id` CHAR(36)     NOT NULL,
  `target_type` ENUM('profile') NOT NULL,
  `target_id`   CHAR(36)     NOT NULL,
  `reason`      ENUM('fake','inappropriate','harassment','spam','underage','scam','other') NOT NULL,
  `detail`      VARCHAR(280) NOT NULL,
  `status`      ENUM('pending','reviewed','actioned','dismissed') NOT NULL DEFAULT 'pending',
  `reviewed_by` CHAR(36)     NULL,
  `review_note` VARCHAR(500) NULL,
  `created_at`  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `reports_status_created_idx` (`status`, `created_at`),
  INDEX `reports_reporter_idx`       (`reporter_id`),
  INDEX `reports_target_idx`         (`target_type`, `target_id`),
  CONSTRAINT `reports_reporter_fk` FOREIGN KEY (`reporter_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `reports_detail_len_chk` CHECK (CHAR_LENGTH(TRIM(`detail`)) >= 10)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── emergency_contacts ───────────────────────────────────────
CREATE TABLE `emergency_contacts` (
  `id`                     CHAR(36)     NOT NULL,
  `user_id`                CHAR(36)     NOT NULL,
  `name`                   VARCHAR(80)  NOT NULL,
  `phone_e164`             VARCHAR(32)  NOT NULL,
  `auto_share_first_date`  BOOLEAN      NOT NULL DEFAULT FALSE,
  `checkin_timer`          BOOLEAN      NOT NULL DEFAULT FALSE,
  `created_at`             TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`             TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `emergency_contacts_user_key` (`user_id`),
  CONSTRAINT `emergency_contacts_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── notifications + device_tokens ────────────────────────────
CREATE TABLE `notifications` (
  `id`         CHAR(36)     NOT NULL,
  `user_id`    CHAR(36)     NOT NULL,
  `type`       VARCHAR(40)  NOT NULL,
  `payload`    JSON         NOT NULL,
  `read`       BOOLEAN      NOT NULL DEFAULT FALSE,
  `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `notifications_user_read_created_idx` (`user_id`, `read`, `created_at`),
  CONSTRAINT `notifications_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `device_tokens` (
  `id`         CHAR(36)     NOT NULL,
  `user_id`    CHAR(36)     NOT NULL,
  `fcm_token`  VARCHAR(255) NOT NULL,
  `platform`   ENUM('ios','android','web') NOT NULL,
  `last_seen`  TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `device_tokens_user_fcm_key` (`user_id`, `fcm_token`),
  CONSTRAINT `device_tokens_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── linked_accounts ──────────────────────────────────────────
CREATE TABLE `linked_accounts` (
  `id`           CHAR(36)     NOT NULL,
  `user_id`      CHAR(36)     NOT NULL,
  `provider`     ENUM('instagram','spotify') NOT NULL,
  `handle`       VARCHAR(120) NOT NULL,
  `data`         JSON         NULL,
  `connected_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`   TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `linked_accounts_user_provider_key` (`user_id`, `provider`),
  CONSTRAINT `linked_accounts_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── user_settings ────────────────────────────────────────────
CREATE TABLE `user_settings` (
  `user_id`             CHAR(36)     NOT NULL,
  `notify_matches`      BOOLEAN      NOT NULL DEFAULT TRUE,
  `notify_messages`     BOOLEAN      NOT NULL DEFAULT TRUE,
  `notify_likes`        BOOLEAN      NOT NULL DEFAULT TRUE,
  `notify_places`       BOOLEAN      NOT NULL DEFAULT TRUE,   -- vestigial
  `notify_events`       BOOLEAN      NOT NULL DEFAULT TRUE,   -- vestigial
  `notify_news`         BOOLEAN      NOT NULL DEFAULT FALSE,
  `email_digest`        BOOLEAN      NOT NULL DEFAULT FALSE,
  `quiet_hours_start`   INT          NULL,
  `quiet_hours_end`     INT          NULL,
  `read_receipts`       BOOLEAN      NOT NULL DEFAULT TRUE,
  `active_status`       BOOLEAN      NOT NULL DEFAULT TRUE,
  `blur_explicit`       BOOLEAN      NOT NULL DEFAULT TRUE,
  `show_me_on_places`   BOOLEAN      NOT NULL DEFAULT TRUE,   -- vestigial
  `created_at`          TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`          TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `user_settings_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── filters ──────────────────────────────────────────────────
CREATE TABLE `filters` (
  `user_id`           CHAR(36)     NOT NULL,
  `looking_for`       JSON         NOT NULL,
  `relationship`      JSON         NOT NULL,
  `drinks`            JSON         NOT NULL,
  `smokes`            JSON         NOT NULL,
  `exercise`          JSON         NOT NULL,
  `weed_420`          JSON         NOT NULL,
  `kids`              JSON         NOT NULL,
  `politics`          JSON         NOT NULL,
  `religion`          JSON         NOT NULL,
  `monogamy`          JSON         NOT NULL,
  `star_sign`         JSON         NOT NULL,
  `interests`         JSON         NOT NULL,
  `age_min`           INT          NOT NULL DEFAULT 18,
  `age_max`           INT          NOT NULL DEFAULT 99,
  `height_min_cm`     INT          NOT NULL DEFAULT 120,
  `height_max_cm`     INT          NOT NULL DEFAULT 220,
  `distance_mi`       INT          NOT NULL DEFAULT 25,
  `show_me_on_places` BOOLEAN      NOT NULL DEFAULT TRUE,   -- vestigial
  `created_at`        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  `updated_at`        TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`user_id`),
  CONSTRAINT `filters_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── refresh_tokens ───────────────────────────────────────────
CREATE TABLE `refresh_tokens` (
  `id`         CHAR(36)     NOT NULL,
  `user_id`    CHAR(36)     NOT NULL,
  `token_hash` VARCHAR(255) NOT NULL,
  `family`     VARCHAR(64)  NOT NULL,
  `parent_id`  CHAR(36)     NULL,
  `user_agent` VARCHAR(255) NULL,
  `ip`         VARCHAR(64)  NULL,
  `expires_at` TIMESTAMP(6) NOT NULL,
  `revoked_at` TIMESTAMP(6) NULL,
  `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  UNIQUE KEY `refresh_tokens_token_hash_key` (`token_hash`),
  INDEX `refresh_tokens_user_idx`   (`user_id`),
  INDEX `refresh_tokens_family_idx` (`family`),
  CONSTRAINT `refresh_tokens_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── otp_attempts ─────────────────────────────────────────────
CREATE TABLE `otp_attempts` (
  `id`         CHAR(36)     NOT NULL,
  `user_id`    CHAR(36)     NULL,
  `phone_e164` VARCHAR(32)  NOT NULL,
  `success`    BOOLEAN      NOT NULL DEFAULT FALSE,
  `ip`         VARCHAR(64)  NULL,
  `created_at` TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`),
  INDEX `otp_attempts_phone_created_idx` (`phone_e164`, `created_at`),
  CONSTRAINT `otp_attempts_user_fk` FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- ── feed_config (singleton) ──────────────────────────────────
CREATE TABLE `feed_config` (
  `id`                        INT          NOT NULL DEFAULT 1,
  `w_recency`                 DOUBLE       NOT NULL DEFAULT 0.30,
  `w_mutual_interests`        DOUBLE       NOT NULL DEFAULT 0.25,
  `w_distance`                DOUBLE       NOT NULL DEFAULT 0.20,
  `w_reciprocal`              DOUBLE       NOT NULL DEFAULT 0.20,
  `w_recently_shown_penalty`  DOUBLE       NOT NULL DEFAULT 0.05,
  `updated_at`                TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `feed_config` (`id`) VALUES (1);
