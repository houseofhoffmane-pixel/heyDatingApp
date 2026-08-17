-- Created on first MySQL container boot (referenced from docker-compose.yml).
-- Creates the shadow DB used by `prisma migrate dev` and the test DB used
-- by the integration suite. Both are granted to the `hey` app user.

CREATE DATABASE IF NOT EXISTS `hey_shadow` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;
CREATE DATABASE IF NOT EXISTS `hey_test`   CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;

GRANT ALL PRIVILEGES ON `hey_shadow`.* TO 'hey'@'%';
GRANT ALL PRIVILEGES ON `hey_test`.*   TO 'hey'@'%';
FLUSH PRIVILEGES;
