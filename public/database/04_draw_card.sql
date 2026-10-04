-- ---------------------------------------------------------------------
-- draw_history: remember WHICH card was drawn, and key it like the rest
-- of the app  (run once, after cards_and_diary.sql)
-- ---------------------------------------------------------------------
-- Two problems this fixes.
--
-- 1. The drawn card was never recorded. /api/draw charged for a reading
--    and /api/cards then picked a card independently, for free — so the
--    reading page could be opened directly, or simply refreshed, for an
--    unlimited supply of unpaid readings. The card is now chosen and
--    stored when the draw is paid for, and the reading page shows that
--    row rather than drawing its own.
--
-- 2. `period` + `category` could not say which of the two kinds of
--    reading a row was. A "Daily" time reading and a "Love" category
--    reading both arrived as (daily, love), so taking one used up the
--    other's free draw. `scope` + `topic` are the same pair used by
--    `card_meanings` and `saves`, and they separate the two cleanly.
--
-- The existing rows are kept: they are backfilled from `period`, and
-- `period`/`category` become nullable rather than being dropped, so
-- nothing that still reads them breaks. They can go once the team
-- agrees nothing does.
-- ---------------------------------------------------------------------

ALTER TABLE `draw_history`
  ADD COLUMN `scope`   VARCHAR(16) NULL AFTER `account_id`,
  ADD COLUMN `topic`   VARCHAR(32) NULL AFTER `scope`,
  ADD COLUMN `card_id` INT UNSIGNED NULL AFTER `topic`,
  ADD CONSTRAINT `draw_history_card_fk`
      FOREIGN KEY (`card_id`) REFERENCES `cards` (`id`)
      ON DELETE SET NULL;

-- Old rows were all written by the draw page as (period, category), with
-- the period being the meaningful half.
UPDATE `draw_history`
   SET `scope` = 'period',
       `topic` = `period`
 WHERE `scope` IS NULL;

ALTER TABLE `draw_history`
  MODIFY COLUMN `period`   VARCHAR(20) NULL,
  MODIFY COLUMN `category` VARCHAR(50) NULL;

-- The free-draw check asks "has this account drawn this topic inside the
-- current window?" on every draw.
ALTER TABLE `draw_history`
  ADD KEY `draw_history_lookup` (`account_id`, `scope`, `topic`, `draw_date`);
