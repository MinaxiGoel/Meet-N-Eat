import { transaction } from "./db.js";
import { currentPeriod, nextPeriod, monthLabel } from "./dates.js";

export const ACTIONS = ["stay", "break", "pause", "leave", "back"];

// Has this member already been through this month's pairing?
// If so, a new choice applies from next month (a match already made stays).
export function alreadyProcessed(monthRow, runs) {
  if (monthRow?.outcome) return true;
  if (runs?.final_at) return true;
  if (runs?.round1_at && monthRow?.round !== 2) return true;
  return false;
}

async function upsertChoice(client, memberId, period, choice, source) {
  await client.query(
    `INSERT INTO member_months (member_id, period, choice, choice_source, chosen_at)
     VALUES ($1, $2, $3, $4, now())
     ON CONFLICT (member_id, period) DO UPDATE
       SET choice = EXCLUDED.choice, choice_source = EXCLUDED.choice_source, chosen_at = now()`,
    [memberId, period, choice, source],
  );
}

// Cancel this month's match when someone leaves; their partner gets priority next month.
export async function cancelCurrentMatch(client, memberId, period) {
  const { rows } = await client.query(
    `SELECT m.id, m.member_low, m.member_high FROM match_members x
     JOIN matches m ON m.id = x.match_id WHERE x.period = $1 AND x.member_id = $2`,
    [period, memberId],
  );
  const match = rows[0];
  if (!match) return;
  const partnerId = match.member_low === memberId ? match.member_high : match.member_low;
  await client.query("DELETE FROM matches WHERE id = $1", [match.id]);
  await client.query(
    `INSERT INTO member_months (member_id, period, outcome) VALUES ($1, $2, 'unmatched')
     ON CONFLICT (member_id, period) DO UPDATE SET outcome = 'unmatched'`,
    [partnerId, period],
  );
}

/**
 * action: stay | break | pause | leave | back ; source: "site" | "email"
 * Returns { status, appliesFrom, message }
 */
export async function setChoice(memberId, action, source, now = new Date()) {
  if (!ACTIONS.includes(action)) throw new Error("Unknown choice.");
  return transaction(async (client) => {
    const { rows: [member] } = await client.query(
      "SELECT id, status FROM members WHERE id = $1 FOR UPDATE", [memberId],
    );
    if (!member) throw new Error("Member not found.");
    const period = currentPeriod(now);
    const { rows: [monthRow] } = await client.query(
      "SELECT * FROM member_months WHERE member_id = $1 AND period = $2", [memberId, period],
    );
    const { rows: [runs] } = await client.query("SELECT * FROM period_runs WHERE period = $1", [period]);
    const target = alreadyProcessed(monthRow, runs) ? nextPeriod(period) : period;
    const appliesFrom = monthLabel(target);

    if (action === "stay" || action === "back") {
      await client.query("UPDATE members SET status = 'active', updated_at = now() WHERE id = $1", [memberId]);
      await upsertChoice(client, memberId, target, "in", source);
      return { status: "active", appliesFrom, message: `You're in for ${appliesFrom}. Your match is on its way! 🍳` };
    }
    if (action === "break") {
      await client.query("UPDATE members SET status = 'active', updated_at = now() WHERE id = $1", [memberId]);
      await upsertChoice(client, memberId, target, "break", source);
      return { status: "active", appliesFrom, message: `Done! You're taking a break in ${appliesFrom}. Enjoy ☕` };
    }
    if (action === "pause") {
      await client.query("UPDATE members SET status = 'paused', updated_at = now() WHERE id = $1", [memberId]);
      return { status: "paused", appliesFrom, message: "Done! You're on pause. We'll still check in each month so you can jump back in." };
    }
    // leave
    await client.query("UPDATE members SET status = 'left', updated_at = now() WHERE id = $1", [memberId]);
    await cancelCurrentMatch(client, memberId, period);
    return { status: "left", appliesFrom: monthLabel(period), message: "You've opted out. No more matches or emails. You're always welcome back 💛" };
  });
}
