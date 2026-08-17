-- Commission follows money actually collected, not the deal's full value —
-- a client can pay a deposit now and the balance later, and the rep should
-- only earn commission on cash that's actually landed. This table records
-- each top-up against an existing advert (the original amount_paid is the
-- first "payment", captured at creation and not duplicated here), with the
-- commission calculated at the SAME rate the booking's own days_paid earns —
-- days determine the rate, money determines how much of that rate is paid
-- out, and when.
CREATE TABLE IF NOT EXISTS advert_payments (
  id SERIAL PRIMARY KEY,
  advert_id INTEGER NOT NULL REFERENCES adverts(id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  commission_amount NUMERIC(10,2) NOT NULL,
  note TEXT,
  recorded_by INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_advert_payments_advert_id ON advert_payments(advert_id);
