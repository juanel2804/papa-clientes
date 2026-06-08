CREATE TABLE IF NOT EXISTS clients (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  community TEXT NOT NULL DEFAULT 'Sin comunidad',
  cutoff_day INTEGER CHECK (cutoff_day BETWEEN 1 AND 31),
  monthly_fee NUMERIC(10, 2),
  phone TEXT NOT NULL DEFAULT '',
  address TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  active BOOLEAN NOT NULL DEFAULT TRUE,
  name_key TEXT GENERATED ALWAYS AS (LOWER(BTRIM(name))) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS clients_name_key_unique_idx ON clients (name_key);
CREATE INDEX IF NOT EXISTS clients_active_idx ON clients (active);
CREATE INDEX IF NOT EXISTS clients_cutoff_idx ON clients (cutoff_day);

CREATE TABLE IF NOT EXISTS payments (
  id BIGSERIAL PRIMARY KEY,
  client_id BIGINT NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  payment_month DATE NOT NULL,
  paid_at DATE,
  amount NUMERIC(10, 2),
  status TEXT NOT NULL CHECK (status IN ('pagado', 'pendiente', 'suspendido', 'condonado', 'inicio')),
  method TEXT NOT NULL DEFAULT 'efectivo',
  notes TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (client_id, payment_month)
);

CREATE INDEX IF NOT EXISTS payments_month_idx ON payments (payment_month);
CREATE INDEX IF NOT EXISTS payments_status_idx ON payments (status);
