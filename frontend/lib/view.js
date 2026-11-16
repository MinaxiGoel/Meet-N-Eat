import { query } from "./db.js";
import {
  currentPeriod, nextPeriod, monthLabel, round1At, isLocalTimeReached, REVEAL_DAY,
} from "./dates.js";
import { MEMBER_COLUMNS, getMemberRow, toMember, toPartner } from "./members.js";
import { alreadyProcessed } from "./participation.js";

const PARTNER_COLUMNS = MEMBER_COLUMNS.split(",").map((c) => `p.${c.trim()}`).join(", ")
  .replace("p.(photo IS NOT NULL) AS has_photo", "(p.photo IS NOT NULL) AS has_photo");

export function isRevealOpen(match, timezone, now = new Date()) {
  if (!match) return false;
  if (match.round === 2) return true;
  return isLocalTimeReached(now, timezone, match.period, REVEAL_DAY, 0);
}

// This month's match for a member, with the partner's row.
export async function getCurrentMatch(memberId, period) {
  const { rows } = await query(
    `SELECT m.id AS match_id, m.period, m.round, m.member_low, m.member_high, m.revealed_low, m.revealed_high,
            ${PARTNER_COLUMNS}
     FROM match_members x
     JOIN matches m ON m.id = x.match_id
     JOIN members p ON p.id = CASE WHEN m.member_low = $2 THEN m.member_high ELSE m.member_low END
     WHERE x.period = $1 AND x.member_id = $2`,
    [period, memberId],
  );
  const row = rows[0];
  if (!row) return null;
  const isLow = row.member_low === memberId;
  return {
    id: row.match_id,
    period: row.period,
    round: row.round,
    isLow,
    revealedAt: isLow ? row.revealed_low : row.revealed_high,
    partnerRow: row,
  };
}

async function getHistory(memberId, period) {
  const { rows } = await query(
    `SELECT m.id AS match_id, m.period, m.member_low, m.revealed_low, m.revealed_high, ${PARTNER_COLUMNS}
     FROM matches m
     JOIN members p ON p.id = CASE WHEN m.member_low = $1 THEN m.member_high ELSE m.member_low END
     WHERE (m.member_low = $1 OR m.member_high = $1)
     ORDER BY m.period DESC`,
    [memberId],
  );
  return rows
    .filter((r) => r.period < period || (r.member_low === memberId ? r.revealed_low : r.revealed_high))
    .map((r) => ({ matchId: r.match_id, period: r.period, month: monthLabel(r.period, true), partner: toPartner(r) }));
}

/**
 * Everything the member app needs, computed on the server.
 * reveal.state is one of: before8 | ready | revealed | round2Pending | noMatch | break | paused | left | newMember
 */
export async function buildMemberView(memberId, now = new Date()) {
  const row = await getMemberRow(memberId);
  if (!row) return null;
  const me = toMember(row);
  const period = currentPeriod(now);
  const next = nextPeriod(period);

  const [{ rows: monthRows }, { rows: runRows }, match, history] = await Promise.all([
    query("SELECT * FROM member_months WHERE member_id = $1 AND period IN ($2, $3)", [memberId, period, next]),
    query("SELECT * FROM period_runs WHERE period = $1", [period]),
    getCurrentMatch(memberId, period),
    getHistory(memberId, period),
  ]);
  const monthRow = monthRows.find((r) => r.period === period);
  const nextRow = monthRows.find((r) => r.period === next);
  const runs = runRows[0];

  let reveal;
  if (me.status === "left") reveal = { state: "left" };
  else if (match) {
    if (!isRevealOpen(match, me.timezone, now)) reveal = { state: "before8" };
    else if (match.revealedAt) reveal = { state: "revealed", partner: toPartner(match.partnerRow) };
    else reveal = { state: "ready" };
  } else if (me.status === "paused") reveal = { state: "paused" };
  else if (monthRow?.choice === "break") reveal = { state: "break" };
  else if (new Date(row.created_at) >= round1At(period)) reveal = { state: "newMember" };
  else if (monthRow?.outcome === "unmatched" || alreadyProcessed(monthRow, runs)) {
    reveal = { state: runs?.final_at ? "noMatch" : "round2Pending" };
  } else if (monthRow?.round === 2) reveal = { state: "round2Pending" };
  else reveal = { state: "before8" };

  const processed = alreadyProcessed(monthRow, runs);
  return {
    me,
    period,
    month: monthLabel(period),
    nextMonth: monthLabel(next),
    reveal,
    history,
    participation: {
      status: me.status,
      thisMonth: monthRow?.choice || "in",
      nextMonth: nextRow?.choice || "in",
      changesApplyFrom: processed ? monthLabel(next) : monthLabel(period),
      isBeforePairing: !processed,
    },
  };
}
