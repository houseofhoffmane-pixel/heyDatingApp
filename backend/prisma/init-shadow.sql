-- Created on first Postgres container boot.
-- - hey_shadow: shadow DB for `prisma migrate dev`.
-- - hey_test:   isolated DB for the integration test suite (Step 13).
CREATE DATABASE hey_shadow WITH OWNER hey;
CREATE DATABASE hey_test WITH OWNER hey;
