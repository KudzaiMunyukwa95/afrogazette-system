-- A booking priced below the fair suggested amount for its day count now
-- requires a one-line reason, stored here so it's visible on the record
-- (and in the activity log) instead of only discoverable by re-querying
-- historical data, as happened with the 7-day/30-day underpricing found
-- via manual analysis before this migration existed.
ALTER TABLE adverts ADD COLUMN IF NOT EXISTS discount_reason TEXT;
