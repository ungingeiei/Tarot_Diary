-- ---------------------------------------------------------------------
-- `accounts.last_login_date`  (run once, after ERD_V2.sql)
-- ---------------------------------------------------------------------
-- The daily check-in needs to remember the date of the last successful
-- claim: it is what `lib/coin.js` compares against CURDATE() to decide
-- whether today's reward is still available, and whether the streak
-- continues (yesterday) or resets (any older).
--
-- ERD_V1_2.sql had this column but ERD_V2.sql dropped it, which left
-- /api/checkin and /api/coins failing with
--   ER_BAD_FIELD_ERROR: Unknown column 'last_login_date'
--
-- NULL, unlike the `NOT NULL` of ERD_V1_2: a brand-new account has not
-- checked in even once, and there is no honest date to put there. A
-- placeholder like '0000-00-00' would be read as a real past check-in
-- and quietly break the first streak. `lib/coin.js` already guards with
-- `if (account.last_login_date)`, so NULL is the value it expects.
-- ---------------------------------------------------------------------

ALTER TABLE `accounts`
  ADD COLUMN `last_login_date` DATE NULL AFTER `streak`;
