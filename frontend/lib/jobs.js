import { query, transaction } from "./db.js";
import { SITE_URL, EMAIL_DAILY_CAP, EMAIL_BATCH_SIZE } from "./config.js";
import {
  currentPeriod, previousPeriod, nextPeriod, monthLabel, checkinStartAt, round1At, round2At,
  isLocalTimeReached, CHECKIN_DAY, MATCH_EMAIL_DAY, SEND_HOUR,
} from "./dates.js";
import { buildPairs, pairKey } from "./pairing.js";
import { sign } from "./tokens.js";
import { sendEmail } from "./email.js";
import { checkinEmail, pausedCheckinEmail, matchEmail, noMatchEmail } from "./templates.js";
import { photoPath } from "./members.js";

const FORTY_FIVE_DAYS = 60 * 60 * 24 * 45;

// ---------------------------------------------------------------- scheduler entry point

// Called by the external scheduler (cron-job.org) every 15–60 minutes.
export async function runScheduler(now = new Date()) {
  const { rows } = await query(
    `INSERT INTO job_locks (name, locked_until) VALUES ('scheduler', now() + interval '10 minutes')
     ON CONFLICT (name) DO UPDATE SET locked_until = EXCLUDED.locked_until
       WHERE job_locks.locked_until < now()
     RETURNING name`,
  );
  if (!rows.length) return { skipped: "Another run is still in progress." };
  try {
    const pairing = await runPairingIfDue(now);
    const emails = await sendDueEmails(now);
    return { at: now.toISOString(), pairing, emails };
  } finally {
    await query("UPDATE job_locks SET locked_until = now() WHERE name = 'scheduler'");
  }
}

// ---------------------------------------------------------------- pairing

export async function runPairingIfDue(now = new Date()) {
  const period = currentPeriod(now);
  const results = [];
  if (now >= round1At(period)) results.push(await runRound(period, 1, now));
  if (now >= round2At(period)) results.push(await runRound(period, 2, now));
  return results.filter(Boolean);
}

async function upsertMonthRows(client, period, ids, round, outcome) {
  if (!ids.length) return;
  await client.query(
    `INSERT INTO member_months (member_id, period, round, outcome)
     SELECT unnest($1::uuid[]), $2::date, $3::smallint, $4::text
     ON CONFLICT (member_id, period) DO UPDATE SET round = EXCLUDED.round, outcome = EXCLUDED.outcome`,
    [ids, period, round, outcome],
  );
}

export async function runRound(period, round, now = new Date()) {
  return transaction(async (client) => {
    await client.query("INSERT INTO period_runs (period) VALUES ($1) ON CONFLICT DO NOTHING", [period]);
    const { rows: [runs] } = await client.query("SELECT * FROM period_runs WHERE period = $1 FOR UPDATE", [period]);
    if (round === 1 && runs.round1_at) return null;
    if (round === 2 && (!runs.round1_at || runs.final_at)) return null;

    const { rows: candidates } = await client.query(
      `SELECT m.id, m.gender, m.created_at, mm.checkin_sent_at, mm.round, mm.outcome,
              prev.outcome AS prev_outcome
       FROM members m
       LEFT JOIN member_months mm ON mm.member_id = m.id AND mm.period = $1
       LEFT JOIN member_months prev ON prev.member_id = m.id AND prev.period = $2
       WHERE m.status = 'active'
         AND m.created_at < $3
         AND COALESCE(mm.choice, 'in') = 'in'
         AND NOT EXISTS (SELECT 1 FROM match_members x WHERE x.period = $1 AND x.member_id = m.id)`,
      [period, previousPeriod(period), round1At(period)],
    );

    let pool;
    let deferred = [];
    if (round === 1) {
      // Only people who have had their check-in (or joined after check-ins began) are paired now.
      // Everyone else waits for round 2, after their check-in arrives.
      const checkinStart = checkinStartAt(period);
      pool = candidates.filter((c) => c.checkin_sent_at || new Date(c.created_at) >= checkinStart);
      const inPool = new Set(pool.map((c) => c.id));
      deferred = candidates.filter((c) => !inPool.has(c.id)).map((c) => c.id);
    } else {
      pool = candidates.filter((c) => c.round === 2 || c.outcome === "unmatched");
    }

    const { rows: history } = await client.query("SELECT member_low, member_high FROM matches");
    const forbidden = new Set(history.map((h) => pairKey(h.member_low, h.member_high)));
    const result = buildPairs(
      pool.map((c) => ({ id: c.id, gender: c.gender, priority: c.prev_outcome === "unmatched" })),
      forbidden,
    );

    if (result.pairs.length) {
      const sorted = result.pairs.map(({ a, b, gender }) => (a < b ? [a, b, gender] : [b, a, gender]));
      await client.query(
        `WITH inserted AS (
           INSERT INTO matches (period, round, gender, member_low, member_high)
           SELECT $1::date, $2::smallint, unnest($3::text[]), unnest($4::uuid[]), unnest($5::uuid[])
           RETURNING id, member_low, member_high
         )
         INSERT INTO match_members (period, member_id, match_id)
         SELECT $1::date, member_low, id FROM inserted
         UNION ALL
         SELECT $1::date, member_high, id FROM inserted`,
        [period, round, sorted.map((s) => s[2]), sorted.map((s) => s[0]), sorted.map((s) => s[1])],
      );
    }
    const matchedIds = result.pairs.flatMap((pair) => [pair.a, pair.b]);
    await upsertMonthRows(client, period, matchedIds, round, "matched");
    await upsertMonthRows(client, period, result.unmatched, round, "unmatched");
    if (deferred.length) {
      await client.query(
        `INSERT INTO member_months (member_id, period, round)
         SELECT unnest($1::uuid[]), $2::date, 2
         ON CONFLICT (member_id, period) DO UPDATE SET round = 2`,
        [deferred, period],
      );
    }

    const final = round === 2 || deferred.length === 0;
    await client.query(
      `UPDATE period_runs SET ${round === 1 ? "round1_at" : "round2_at"} = $2,
         final_at = CASE WHEN $3 THEN $2 ELSE final_at END
       WHERE period = $1`,
      [period, now, final],
    );
    const summary = { period, round, pairs: result.pairs.length, byGender: result.byGender, deferredToRound2: deferred.length };
    console.log("[pairing]", JSON.stringify(summary));
    return summary;
  });
}

// ---------------------------------------------------------------- emails

function choiceLinks(memberId, period) {
  const token = sign("choice", { m: memberId, per: period }, FORTY_FIVE_DAYS);
  const link = (action) => `${SITE_URL}/choice?t=${encodeURIComponent(token)}&a=${action}`;
  return {
    break: link("break"), pause: link("pause"), leave: link("leave"), back: link("back"),
    site: SITE_URL, settings: `${SITE_URL}/app?tab=settings`,
    unsubscribe: `${SITE_URL}/api/unsubscribe?t=${encodeURIComponent(token)}`,
  };
}

// Reserve the right to send one email (so retries and parallel runs never double-send).
async function claim(memberId, period, type) {
  const { rows } = await query(
    `INSERT INTO email_log (member_id, period, type, status) VALUES ($1, $2, $3, 'sending')
     ON CONFLICT (member_id, period, type) DO UPDATE
       SET status = 'sending', attempts = email_log.attempts + 1, claimed_at = now(), error = NULL
       WHERE (email_log.status = 'failed' AND email_log.attempts < 3)
          OR (email_log.status = 'sending' AND email_log.claimed_at < now() - interval '30 minutes')
     RETURNING id`,
    [memberId, period, type],
  );
  return rows[0]?.id || null;
}

async function finish(id, error) {
  if (error) {
    await query("UPDATE email_log SET status = 'failed', error = $2 WHERE id = $1", [id, String(error.message || error).slice(0, 500)]);
  } else {
    await query("UPDATE email_log SET status = 'sent', sent_at = now() WHERE id = $1", [id]);
  }
}

const notYetSent = (type) => `NOT EXISTS (
  SELECT 1 FROM email_log e WHERE e.member_id = m.id AND e.period = $1 AND e.type = '${type}'
    AND (e.status IN ('sent', 'sending') OR e.attempts >= 3))`;

export async function sendDueEmails(now = new Date()) {
  const period = currentPeriod(now);
  const month = monthLabel(period);
  const { rows: [{ count }] } = await query(
    "SELECT count(*)::int AS count FROM email_log WHERE status = 'sent' AND sent_at > now() - interval '24 hours'",
  );
  let budget = Math.min(EMAIL_DAILY_CAP - count, EMAIL_BATCH_SIZE);
  const summary = { checkin: 0, match: 0, noMatch: 0, failed: 0, sentLast24h: count, dailyCap: EMAIL_DAILY_CAP };
  if (budget <= 0) return { ...summary, note: "Daily limit reached; the rest roll over to the next run." };
  const { rows: [runs] } = await query("SELECT * FROM period_runs WHERE period = $1", [period]);

  async function deliver(memberId, type, build) {
    const id = await claim(memberId, period, type);
    if (!id) return false;
    try {
      await sendEmail(build());
      await finish(id);
      budget -= 1;
      return true;
    } catch (error) {
      console.error(`[email] ${type} to ${memberId} failed:`, error.message);
      await finish(id, error);
      summary.failed += 1;
      budget -= 1;
      return false;
    }
  }

  // 1) Email 1 — check-in, from the 3rd at 09:00 local time. Not needed once pairing is final.
  if (!runs?.final_at) {
    const { rows } = await query(
      `SELECT m.id, m.email, m.first_name, m.timezone, m.status
       FROM members m
       LEFT JOIN member_months prev ON prev.member_id = m.id AND prev.period = $2
       WHERE m.status IN ('active', 'paused') AND m.created_at < $3 AND ${notYetSent("checkin")}
       ORDER BY prev.checkin_sent_at DESC NULLS LAST, m.created_at`,
      [period, previousPeriod(period), checkinStartAt(period)],
    );
    for (const member of rows) {
      if (budget <= 0) break;
      if (!isLocalTimeReached(now, member.timezone, period, CHECKIN_DAY, SEND_HOUR)) continue;
      const links = choiceLinks(member.id, period);
      const ok = await deliver(member.id, "checkin", () => {
        const content = member.status === "paused"
          ? pausedCheckinEmail({ firstName: member.first_name, month, links })
          : checkinEmail({ firstName: member.first_name, month, links });
        return { to: member.email, ...content, unsubscribeUrl: links.unsubscribe };
      });
      if (ok) {
        summary.checkin += 1;
        await query(
          `INSERT INTO member_months (member_id, period, checkin_sent_at) VALUES ($1, $2, now())
           ON CONFLICT (member_id, period) DO UPDATE SET checkin_sent_at = now()`,
          [member.id, period],
        );
      }
    }
  }

  // 2) Email 2 — match details, from the 10th at 09:00 local time. Round 1 first, then round 2.
  if (budget > 0) {
    const { rows } = await query(
      `SELECT m.id, m.email, m.first_name, m.timezone, mt.round,
              p.first_name AS p_first_name, p.last_name AS p_last_name, p.job_title AS p_job_title,
              p.company AS p_company, p.linkedin_url AS p_linkedin_url, p.fun_facts AS p_fun_facts,
              p.photo_key AS p_photo_key, (p.photo IS NOT NULL) AS p_has_photo
       FROM match_members x
       JOIN matches mt ON mt.id = x.match_id
       JOIN members m ON m.id = x.member_id
       JOIN members p ON p.id = CASE WHEN mt.member_low = m.id THEN mt.member_high ELSE mt.member_low END
       WHERE x.period = $1 AND m.status <> 'left' AND p.status <> 'left' AND ${notYetSent("match")}
       ORDER BY mt.round, mt.created_at`,
      [period],
    );
    for (const row of rows) {
      if (budget <= 0) break;
      if (!isLocalTimeReached(now, row.timezone, period, MATCH_EMAIL_DAY, SEND_HOUR)) continue;
      const partner = {
        firstName: row.p_first_name, lastName: row.p_last_name, jobTitle: row.p_job_title,
        company: row.p_company, linkedinUrl: row.p_linkedin_url, funFacts: row.p_fun_facts,
        photoUrl: photoPath({ has_photo: row.p_has_photo, photo_key: row.p_photo_key }, true),
      };
      const links = choiceLinks(row.id, period);
      if (await deliver(row.id, "match", () => ({
        to: row.email, ...matchEmail({ firstName: row.first_name, month, partner, links }),
      }))) summary.match += 1;
    }
  }

  // 3) "No match this month" note (replaces Email 2), once pairing is final.
  if (budget > 0 && runs?.final_at) {
    const { rows } = await query(
      `SELECT m.id, m.email, m.first_name, m.timezone
       FROM member_months mm JOIN members m ON m.id = mm.member_id
       WHERE mm.period = $1 AND mm.outcome = 'unmatched' AND m.status <> 'left'
         AND NOT EXISTS (SELECT 1 FROM match_members x WHERE x.period = $1 AND x.member_id = m.id)
         AND ${notYetSent("no_match")}`,
      [period],
    );
    for (const member of rows) {
      if (budget <= 0) break;
      if (!isLocalTimeReached(now, member.timezone, period, MATCH_EMAIL_DAY, SEND_HOUR)) continue;
      const links = choiceLinks(member.id, period);
      if (await deliver(member.id, "no_match", () => ({
        to: member.email, ...noMatchEmail({ firstName: member.first_name, nextMonth: monthLabel(nextPeriod(period)), links }),
      }))) summary.noMatch += 1;
    }
  }

  if (budget <= 0) summary.note = "Batch or daily limit reached; the rest go out on the next run.";
  return summary;
}
