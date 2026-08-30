-- The 60-day client-ownership policy had no code enforcing it — Free
-- Clients only ever showed who's dormant, nothing stopped a different rep
-- from booking a client still inside someone else's window and getting
-- paid for it anyway. This column records why an ownership-window booking
-- was allowed to proceed, the same visible-not-blocked pattern already
-- used for discount_reason: negotiation/handoffs stay possible, they just
-- can't happen silently.
ALTER TABLE adverts ADD COLUMN IF NOT EXISTS ownership_override_reason TEXT;
