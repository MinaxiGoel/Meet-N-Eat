import pg from "pg";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required. Add a Railway Postgres database or set it in backend/.env.");
}

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : undefined,
  max: 10,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 10_000,
});

export async function initializeDatabase() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS members (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      provider_subject TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL DEFAULT '',
      first_name TEXT NOT NULL DEFAULT '',
      last_name TEXT NOT NULL DEFAULT '',
      gender_identity TEXT,
      email TEXT,
      email_verified BOOLEAN NOT NULL DEFAULT FALSE,
      contact_email TEXT,
      photo_url TEXT,
      linkedin_url TEXT,
      preferred_language TEXT NOT NULL DEFAULT 'English',
      interests TEXT[] NOT NULL DEFAULT '{}',
      bio TEXT NOT NULL DEFAULT '',
      email_consent BOOLEAN NOT NULL DEFAULT FALSE,
      profile_completed BOOLEAN NOT NULL DEFAULT FALSE,
      matching_frequency TEXT NOT NULL DEFAULT 'monthly',
      is_paused BOOLEAN NOT NULL DEFAULT FALSE,
      opted_out_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE members ADD COLUMN IF NOT EXISTS linkedin_url TEXT;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS email_consent BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT FALSE;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE members ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE members ADD COLUMN IF NOT EXISTS gender_identity TEXT;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS contact_email TEXT;
    ALTER TABLE members ADD COLUMN IF NOT EXISTS matching_frequency TEXT NOT NULL DEFAULT 'monthly';

    CREATE TABLE IF NOT EXISTS monthly_matches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      member_one UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      member_two UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      CONSTRAINT different_members CHECK (member_one <> member_two),
      CONSTRAINT unique_monthly_pair UNIQUE (member_one, member_two, period)
    );

    CREATE INDEX IF NOT EXISTS monthly_matches_member_one_period_idx ON monthly_matches(member_one, period DESC);
    CREATE INDEX IF NOT EXISTS monthly_matches_member_two_period_idx ON monthly_matches(member_two, period DESC);

    CREATE TABLE IF NOT EXISTS match_feedback (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id UUID NOT NULL REFERENCES monthly_matches(id) ON DELETE CASCADE,
      member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('connected', 'report')),
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (match_id, member_id, kind)
    );

    CREATE TABLE IF NOT EXISTS email_deliveries (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      match_id UUID NOT NULL REFERENCES monthly_matches(id) ON DELETE CASCADE,
      member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
      period TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
      sent_at TIMESTAMPTZ,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (match_id, member_id)
    );
  `);
}
