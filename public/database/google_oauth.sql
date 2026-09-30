-- ---------------------------------------------------------------------
-- Google OAuth support for `accounts`  (run once, after ERD_V2.sql)
-- ---------------------------------------------------------------------
-- 1. `google_sub` stores Google's immutable per-user id (the `sub`
--    claim). Matching on it rather than on the email means a user who
--    later changes their Gmail address still lands on the same account.
--    UNIQUE so one Google identity cannot be attached to two accounts.
-- 2. `pwd` becomes nullable: an account created through Google has no
--    password at all. Storing a dummy hash instead would leave a
--    password that something could one day be tricked into accepting.
-- ---------------------------------------------------------------------

ALTER TABLE `accounts`
  ADD COLUMN `google_sub` VARCHAR(255) NULL AFTER `pwd`,
  ADD UNIQUE KEY `uniq_accounts_google_sub` (`google_sub`);

ALTER TABLE `accounts`
  MODIFY COLUMN `pwd` VARCHAR(255) NULL;
