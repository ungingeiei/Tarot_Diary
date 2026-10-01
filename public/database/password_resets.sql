-- =====================================================================
-- password_resets.sql
-- ---------------------------------------------------------------------
-- Run this ONCE on your MySQL database (same one as ERD_V2.sql) before
-- using the forgot-password / reset-password API routes.
--
-- Each row = one reset link that was emailed to a user.
--   * token_hash : SHA-256 of the token that is in the emailed link.
--                  We never store the raw token, so a leaked database
--                  cannot be used to reset anyone's password.
--   * expires_at : the link stops working after this time (30 minutes).
--   * used_at    : set when the link is used, so it only works ONCE.
--
-- Rows are deleted automatically if the account is deleted (CASCADE).
-- =====================================================================

CREATE TABLE IF NOT EXISTS `password_resets` (
    `id`          INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `account_id`  INT UNSIGNED NOT NULL,
    `token_hash`  CHAR(64)     NOT NULL,
    `expires_at`  DATETIME     NOT NULL,
    `used_at`     DATETIME     NULL,
    `created_at`  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_password_resets_token` (`token_hash`),
    KEY `idx_password_resets_account` (`account_id`),

    FOREIGN KEY (`account_id`)
        REFERENCES `accounts`(`id`)
        ON DELETE CASCADE
);
