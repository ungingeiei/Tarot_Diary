-- ---------------------------------------------------------------------
-- `accounts.l_name`  (run once, after ERD_V2.sql)
-- ---------------------------------------------------------------------
-- The profile page asks for a first name AND a last name, but `accounts`
-- only ever had `f_name`. Packing both into `f_name` would mean guessing
-- where one ends and the other begins every time the page is shown —
-- wrong for anyone with two given names or a multi-word surname.
--
-- NULL because every account created so far (registration and Google
-- sign-in alike) only supplied one name, and an empty string would be
-- indistinguishable from a surname the user deliberately left blank.
-- ---------------------------------------------------------------------

ALTER TABLE `accounts`
  ADD COLUMN `l_name` VARCHAR(255) NULL AFTER `f_name`;
