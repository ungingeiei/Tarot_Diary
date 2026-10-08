-- =====================================================================
-- 08_draw_history_fix.sql
-- Fixes: Unknown column 'h.scope' in 'where clause'
-- Adds scope, topic, card_id to draw_history if they are missing, and makes
-- the old period/category columns nullable (if they exist) so inserts that
-- don't fill them don't fail. Safe to run more than once.
-- Run the WHOLE file in one go.
-- =====================================================================

-- scope
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'draw_history' AND COLUMN_NAME = 'scope') = 0,
              'ALTER TABLE draw_history ADD COLUMN `scope` VARCHAR(16) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- topic
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'draw_history' AND COLUMN_NAME = 'topic') = 0,
              'ALTER TABLE draw_history ADD COLUMN `topic` VARCHAR(32) NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- card_id
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS
               WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'draw_history' AND COLUMN_NAME = 'card_id') = 0,
              'ALTER TABLE draw_history ADD COLUMN `card_id` INT UNSIGNED NULL', 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- old `period` column: allow NULL
SET @sql = IFNULL((SELECT CONCAT('ALTER TABLE draw_history MODIFY COLUMN `period` ', COLUMN_TYPE, ' NULL')
                   FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'draw_history'
                     AND COLUMN_NAME = 'period' AND IS_NULLABLE = 'NO'), 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;

-- old `category` column: allow NULL
SET @sql = IFNULL((SELECT CONCAT('ALTER TABLE draw_history MODIFY COLUMN `category` ', COLUMN_TYPE, ' NULL')
                   FROM information_schema.COLUMNS
                   WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'draw_history'
                     AND COLUMN_NAME = 'category' AND IS_NULLABLE = 'NO'), 'SELECT 1');
PREPARE s FROM @sql; EXECUTE s; DEALLOCATE PREPARE s;
