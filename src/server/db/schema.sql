\set ON_ERROR_STOP true

-- Auth.js Neon Adapter required tables
-- https://authjs.dev/getting-started/adapters/neon

CREATE TABLE IF NOT EXISTS verification_token
(
  identifier TEXT         NOT NULL,
  expires    TIMESTAMPTZ  NOT NULL,
  token      TEXT         NOT NULL,

  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS accounts
(
  id                  SERIAL,
  "userId"            INTEGER       NOT NULL,
  type                VARCHAR(255)  NOT NULL,
  provider            VARCHAR(255)  NOT NULL,
  "providerAccountId" VARCHAR(255)  NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          INTEGER,
  id_token            TEXT,
  scope               TEXT,
  session_state       TEXT,
  token_type          TEXT,

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS sessions
(
  id             SERIAL,
  "userId"       INTEGER       NOT NULL,
  expires        TIMESTAMPTZ   NOT NULL,
  "sessionToken" VARCHAR(255)  NOT NULL,

  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users
(
  id              SERIAL,
  public_id       TEXT           UNIQUE NOT NULL,
  name            VARCHAR(255),
  email           VARCHAR(255)   UNIQUE,
  "emailVerified" TIMESTAMPTZ,
  image           TEXT,

  PRIMARY KEY (id)
);

-- Application-specific tables

CREATE TABLE IF NOT EXISTS app_bases (
  base_id    SERIAL       PRIMARY KEY,
  user_id    TEXT         NOT NULL
    REFERENCES users(public_id) ON DELETE CASCADE,
  name       TEXT         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_base UNIQUE(user_id, name)
);
CREATE INDEX ON app_bases(user_id);
CREATE INDEX ON app_bases(user_id, base_id);

CREATE TABLE IF NOT EXISTS app_tables (
  table_id    SERIAL       PRIMARY KEY,
  base_id     INT          NOT NULL
    REFERENCES app_bases(base_id) ON DELETE CASCADE,
  name        TEXT         NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_base_table UNIQUE(base_id, name)
);
CREATE INDEX ON app_tables(base_id);

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
  CONSTRAINT uq_table_column_position UNIQUE (table_id, position)
);

CREATE TABLE IF NOT EXISTS app_rows (
  row_id         BIGSERIAL      PRIMARY KEY,
  table_id       INT            NOT NULL  REFERENCES app_tables(table_id)  ON DELETE CASCADE,
  data           JSONB          NOT NULL  DEFAULT '{}',
  created_at     TIMESTAMPTZ    NOT NULL  DEFAULT now(),
  updated_at     TIMESTAMPTZ    NOT NULL  DEFAULT now(),
  -- full-text search over every value in the JSONB column
  search_vector  TSVECTOR       GENERATED ALWAYS AS (to_tsvector('english', data::text)) STORED
);

-- index for keyset pagination
CREATE INDEX ON app_rows(table_id, row_id);
-- index for containment queries only
CREATE INDEX ON app_rows USING GIN (data jsonb_path_ops);
CREATE INDEX ON app_rows USING GIN (search_vector);

CREATE TABLE IF NOT EXISTS saved_filters (
  filter_id   SERIAL       PRIMARY KEY,
  base_id     INT          NOT NULL REFERENCES app_bases(base_id) ON DELETE CASCADE,
  table_id    INT          NOT NULL REFERENCES app_tables(table_id) ON DELETE CASCADE,
  name        TEXT         NOT NULL,
  filters     JSONB        NOT NULL,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT now(),
  CONSTRAINT uq_user_table_filter UNIQUE (table_id, name)
);
CREATE INDEX ON saved_filters(base_id, table_id);

-- RLS

-- USING (…) controls which existing rows a user can read, update or delete.
-- WITH CHECK (…) controls which new or modified rows a user is allowed to write.
-- If you omit WITH CHECK, anyone can insert or update rows regardless of ownership policy.

-- In Postgres both typically become a semi-join in the planner, but:
  -- EXISTS (SELECT 1 … WHERE …) stops at the first match and is very efficient for correlated checks.
  -- … IN (SELECT col … ) often builds a transient hash or sorts the inner set, which can be slightly heavier if the inner set is large.
-- For owner-only policies (checking a single base/user match), EXISTS is marginally better and clearer.

ALTER TABLE app_bases ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_bases_owner_only
  ON app_bases
  FOR ALL
  USING ( user_id = current_setting('app.current_user') )
  WITH CHECK ( user_id = current_setting('app.current_user') );

ALTER TABLE app_tables ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_tables_owner_only
  ON app_tables
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
        FROM app_bases b
       WHERE b.base_id = app_tables.base_id
         AND b.user_id = current_setting('app.current_user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM app_bases b
       WHERE b.base_id = app_tables.base_id
         AND b.user_id = current_setting('app.current_user')
    )
  );

ALTER TABLE app_columns ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_columns_owner_only
  ON app_columns
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
        FROM app_tables t
        JOIN app_bases b ON t.base_id = b.base_id
       WHERE t.table_id = app_columns.table_id
         AND b.user_id = current_setting('app.current_user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM app_tables t
        JOIN app_bases b ON t.base_id = b.base_id
       WHERE t.table_id = app_columns.table_id
         AND b.user_id = current_setting('app.current_user')
    )
  );

ALTER TABLE app_rows ENABLE ROW LEVEL SECURITY;
CREATE POLICY app_rows_owner_only
  ON app_rows
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
        FROM app_tables t
        JOIN app_bases b ON t.base_id = b.base_id
       WHERE t.table_id = app_rows.table_id
         AND b.user_id = current_setting('app.current_user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM app_tables t
        JOIN app_bases b ON t.base_id = b.base_id
       WHERE t.table_id = app_rows.table_id
         AND b.user_id = current_setting('app.current_user')
    )
  );

ALTER TABLE saved_filters ENABLE ROW LEVEL SECURITY;
CREATE POLICY saved_filters_owner_only
  ON saved_filters
  FOR ALL
  USING (
    EXISTS (
      SELECT 1
        FROM app_bases b
       WHERE b.base_id = saved_filters.base_id
         AND b.user_id = current_setting('app.current_user')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
        FROM app_bases b
       WHERE b.base_id = saved_filters.base_id
         AND b.user_id = current_setting('app.current_user')
    )
  );

-- Triggers

-- Overhead
  -- The trigger fires within your UPDATE statement for each row; 
  -- it does not issue a separate SQL command or round-trip.

  -- It does incur a tiny per-row PL/pgSQL function call, 
  -- but in practice that cost is negligible compared to I/O or other query work.

CREATE OR REPLACE FUNCTION set_updated_at()
  RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER app_bases_set_updated_at
  BEFORE UPDATE ON app_bases
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER app_tables_set_updated_at
  BEFORE UPDATE ON app_tables
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER app_columns_set_updated_at
  BEFORE UPDATE ON app_columns
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER app_rows_set_updated_at
  BEFORE UPDATE ON app_rows
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER saved_filters_set_updated_at
  BEFORE UPDATE ON saved_filters
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();
