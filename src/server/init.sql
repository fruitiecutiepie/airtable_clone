CREATE TABLE IF NOT EXISTS app_tables (
  table_id    SERIAL       PRIMARY KEY,
  name        TEXT         NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS app_columns (
  column_id   SERIAL       PRIMARY KEY,
  table_id    INT          NOT NULL REFERENCES app_tables(table_id) ON DELETE CASCADE,
  name        TEXT         NOT NULL,
  data_type   TEXT         NOT NULL
    CHECK (data_type IN ('text', 'numeric', 'boolean', 'date')),
  position    INT          NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_table_column UNIQUE (table_id, name),
);
