-- Meet-N-Eat database schema (Neon Postgres).
-- Safe to run more than once: `npm run db:setup`.

CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  linkedin_sub      text NOT NULL UNIQUE,
  email             citext NOT NULL UNIQUE,
  first_name        text NOT NULL,
  last_name         text NOT NULL,
  gender            text NOT NULL CHECK (gender IN ('woman', 'man', 'non_binary', 'prefer_not_to_say')),
  job_title         text NOT NULL,
  company           text NOT NULL,
  linkedin_url      text NOT NULL,
  fun_facts         text NOT NULL,
  timezone          text NOT NULL DEFAULT 'UTC',
  photo             bytea,
  photo_type        text,
  photo_key         uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  status            text NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'left')),
  referral_code     text NOT NULL UNIQUE,
  referred_by       uuid REFERENCES members(id) ON DELETE SET NULL,
  age_confirmed_at  timestamptz NOT NULL,
  terms_accepted_at timestamptz NOT NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- One row per member per month: their choice and what happened.
CREATE TABLE IF NOT EXISTS member_months (
  member_id        uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  period           date NOT NULL,
  choice           text NOT NULL DEFAULT 'in' CHECK (choice IN ('in', 'break')),
  choice_source    text NOT NULL DEFAULT 'default' CHECK (choice_source IN ('default', 'email', 'site')),
  chosen_at        timestamptz,
  checkin_sent_at  timestamptz,
  round            smallint CHECK (round IN (1, 2)),
  outcome          text CHECK (outcome IN ('matched', 'unmatched')),
  PRIMARY KEY (member_id, period)
);

CREATE TABLE IF NOT EXISTS matches (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period         date NOT NULL,
  round          smallint NOT NULL CHECK (round IN (1, 2)),
  gender         text NOT NULL,
  member_low     uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  member_high    uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  revealed_low   timestamptz,
  revealed_high  timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  CHECK (member_low < member_high),
  UNIQUE (member_low, member_high)            -- the same two people are never paired again
);

-- At most one match per member per month.
CREATE TABLE IF NOT EXISTS match_members (
  period     date NOT NULL,
  member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  match_id   uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  PRIMARY KEY (period, member_id)
);

-- Strict same-gender pairing: the database refuses any other match.
CREATE OR REPLACE FUNCTION mne_check_match_gender() RETURNS trigger AS $$
DECLARE g_low text; g_high text;
BEGIN
  SELECT gender INTO g_low FROM members WHERE id = NEW.member_low;
  SELECT gender INTO g_high FROM members WHERE id = NEW.member_high;
  IF g_low IS DISTINCT FROM g_high OR g_low IS DISTINCT FROM NEW.gender THEN
    RAISE EXCEPTION 'Meet-N-Eat only pairs members of the same gender (% vs %)', g_low, g_high;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS mne_match_gender ON matches;
CREATE TRIGGER mne_match_gender BEFORE INSERT OR UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION mne_check_match_gender();

CREATE TABLE IF NOT EXISTS period_runs (
  period     date PRIMARY KEY,
  round1_at  timestamptz,
  round2_at  timestamptz,
  final_at   timestamptz
);

CREATE TABLE IF NOT EXISTS email_log (
  id         bigserial PRIMARY KEY,
  member_id  uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  period     date NOT NULL,
  type       text NOT NULL CHECK (type IN ('checkin', 'match', 'no_match')),
  status     text NOT NULL CHECK (status IN ('sending', 'sent', 'failed')),
  attempts   integer NOT NULL DEFAULT 1,
  sent_at    timestamptz,
  error      text,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (member_id, period, type)
);
CREATE INDEX IF NOT EXISTS email_log_sent_at ON email_log (sent_at) WHERE status = 'sent';

CREATE TABLE IF NOT EXISTS feedback (
  id          bigserial PRIMARY KEY,
  member_id   uuid NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  match_id    uuid REFERENCES matches(id) ON DELETE SET NULL,
  met         text CHECK (met IN ('yes', 'not_yet', 'could_not')),
  rating      smallint CHECK (rating BETWEEN 1 AND 5),
  comment     text,
  is_concern  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Stops two scheduler calls from running at the same time.
CREATE TABLE IF NOT EXISTS job_locks (
  name          text PRIMARY KEY,
  locked_until  timestamptz NOT NULL
);
