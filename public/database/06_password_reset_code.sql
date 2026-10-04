-- Adds a 6-digit CODE to password reset requests (run AFTER password_resets.sql).
--
-- The forgot-password page now sends the user straight to /reset-password, where
-- they type the code from the email together with the new password.
--   code_hash : SHA-256 of the code (the code itself is never stored)
--   attempts  : how many times a code was tried; the code is burned after 5 tries
--
--   mysql -u <user> -p <database> < public/database/password_reset_code.sql
ALTER TABLE `password_resets`
  ADD COLUMN `code_hash` CHAR(64) NULL AFTER `token_hash`,
  ADD COLUMN `attempts` TINYINT UNSIGNED NOT NULL DEFAULT 0 AFTER `code_hash`;
