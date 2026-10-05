-- ---------------------------------------------------------------------
-- Cards + diary: the tables the app actually reads from
-- (run once, after ERD_V2.sql)
-- ---------------------------------------------------------------------
-- Replaces the two mock layers, src/data/cards.js (card text) and
-- src/lib/diary.js (saved readings in localStorage), with real data.
--
-- WHY `cards` ALONE WAS NOT ENOUGH
-- `cards` has one `pred` + one `adv` per card, but a card does not have
-- one meaning: the app shows a different reading for each of the five
-- categories (love, finance, career, pets, health) and each of the
-- three periods (daily, weekly, monthly). That is up to eight distinct
-- texts per card, so they get their own table and `cards` keeps only
-- what is true of the card itself.
-- ---------------------------------------------------------------------

-- `pred` now holds the one category-independent blurb printed on the
-- shareable image; `adv` has no card-level meaning any more, since
-- every piece of advice belongs to a category or a period.
ALTER TABLE `cards`
  MODIFY COLUMN `adv` MEDIUMTEXT NULL;
ALTER TABLE `cards` DROP INDEX `kind`;
CREATE TABLE IF NOT EXISTS `card_meanings` (
    `id`      INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `card_id` INT UNSIGNED NOT NULL,
    `scope`   VARCHAR(16) NOT NULL,
    `topic`   VARCHAR(32) NOT NULL,
    `summary` MEDIUMTEXT NOT NULL,
    `advice`  MEDIUMTEXT NOT NULL,
    PRIMARY KEY (`id`),
    UNIQUE KEY `uniq_card_scope_topic` (`card_id`, `scope`, `topic`),

    CONSTRAINT `card_meanings_card_fk`
        FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`)
        ON DELETE CASCADE
);

-- ---------------------------------------------------------------------
-- `saves`: one row = one reading the user kept in their diary.
-- ---------------------------------------------------------------------
-- The old primary key was (card_id, diary_id, date), which silently
-- allowed only ONE save per card per day — drawing the Fool for love
-- and again for career on the same day would collide and fail. A
-- surrogate id removes that limit, and `scope`/`topic` record which
-- reading was saved so the text can be read back from `card_meanings`
-- instead of being copied into the row.
--
-- Safe to run as written only while `saves` is empty, which it is: a
-- table with rows would need those rows migrated onto the new key.
-- ---------------------------------------------------------------------

-- The foreign key on `card_id` leans on the primary key's index, so it
-- needs an index of its own before that primary key can go away.
ALTER TABLE `saves`
  ADD KEY `saves_card_id` (`card_id`);

ALTER TABLE `saves`
  DROP PRIMARY KEY,
  ADD COLUMN `id` INT UNSIGNED NOT NULL AUTO_INCREMENT FIRST,
  ADD PRIMARY KEY (`id`),
  ADD COLUMN `scope` VARCHAR(16) NOT NULL AFTER `diary_id`,
  ADD COLUMN `topic` VARCHAR(32) NOT NULL AFTER `scope`,
  -- `date` is a DATE and cannot order two readings saved the same day.
  ADD COLUMN `saved_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP AFTER `date`,
  ADD KEY `saves_diary_saved_at` (`diary_id`, `saved_at`);

-- One diary per account, which the API relies on when it looks up
-- "this user's diary" before inserting a save.
ALTER TABLE `diaries`
  ADD UNIQUE KEY `uniq_diaries_acc` (`acc_id`);
