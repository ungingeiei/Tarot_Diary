-- =====================================================================
-- 09_password_reset_pin.sql
-- ---------------------------------------------------------------------
-- Run this ONCE, after 05_password_resets.sql.
--
-- WHY: holding the reset URL used to be enough to set a new password.
-- The token is handed straight to the browser (no email step), so
-- anyone who could reach /api/auth/forgot-password with a registered
-- address could take over that account.
--
-- From now on a reset needs TWO things:
--   1. the token in the URL      — proves the reset was started here
--   2. a 6-digit PIN, emailed    — proves the person owns the mailbox
--
-- The new columns hold the second half:
--   * pin_hash     : SHA-256 of the 6 digits. The plain PIN exists only
--                    in the user's inbox, exactly like token_hash.
--   * pin_attempts : wrong tries so far. At 5 the row is burned, so a
--                    script cannot walk all 1,000,000 PINs.
--   * verified_at  : set the moment the right PIN is typed. Until it is
--                    NOT NULL, the new-password form is refused.
--
-- Existing rows get verified_at = NULL, i.e. any reset link already in
-- flight when this migration runs stops working. That is intended —
-- those links are the ones this change exists to invalidate.
-- =====================================================================

ALTER TABLE `password_resets`
    ADD COLUMN `pin_hash`     CHAR(64)         NULL AFTER `token_hash`,
    ADD COLUMN `pin_attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER `pin_hash`,
    ADD COLUMN `verified_at`  DATETIME         NULL AFTER `expires_at`;
