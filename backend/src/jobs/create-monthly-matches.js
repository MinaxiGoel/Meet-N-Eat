import "dotenv/config";
import { randomInt } from "node:crypto";
import { pool, initializeDatabase } from "../db.js";

const frequencyMonths = { monthly: 1, every_two_months: 2, quarterly: 3 };
const pairKey = (a, b) => [a, b].sort().join(":");

function shuffle(values) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randomInt(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Edmonds' blossom algorithm finds a maximum-cardinality matching in a general graph.
// The graph contains only never-before-used pairs, so it never needs repeat fallback.
function maximumMatching(vertices, forbiddenPairs) {
  const ids = shuffle(vertices);
  const n = ids.length;
  const graph = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (!forbiddenPairs.has(pairKey(ids[i], ids[j]))) {
        graph[i].push(j);
        graph[j].push(i);
      }
    }
  }
  graph.forEach((neighbors) => { const shuffled = shuffle(neighbors); neighbors.splice(0, neighbors.length, ...shuffled); });

  const match = Array(n).fill(-1);
  const parent = Array(n);
  const base = Array(n);
  const used = Array(n);
  const blossom = Array(n);
  const lca = (a, b) => {
    const seen = Array(n).fill(false);
    while (true) {
      a = base[a];
      seen[a] = true;
      if (match[a] === -1) break;
      a = parent[match[a]];
    }
    while (true) {
      b = base[b];
      if (seen[b]) return b;
      b = parent[match[b]];
    }
  };
  const markPath = (v, b, child) => {
    while (base[v] !== b) {
      blossom[base[v]] = blossom[base[match[v]]] = true;
      parent[v] = child;
      child = match[v];
      v = parent[match[v]];
    }
  };
  const findAugmentingPath = (root) => {
    used.fill(false); parent.fill(-1);
    for (let i = 0; i < n; i += 1) base[i] = i;
    const queue = [root]; used[root] = true;
    for (let head = 0; head < queue.length; head += 1) {
      const v = queue[head];
      for (const u of graph[v]) {
        if (base[v] === base[u] || match[v] === u) continue;
        if (u === root || (match[u] !== -1 && parent[match[u]] !== -1)) {
          const common = lca(v, u);
          blossom.fill(false);
          markPath(v, common, u); markPath(u, common, v);
          for (let i = 0; i < n; i += 1) {
            if (blossom[base[i]]) {
              base[i] = common;
              if (!used[i]) { used[i] = true; queue.push(i); }
            }
          }
        } else if (parent[u] === -1) {
          parent[u] = v;
          if (match[u] === -1) return u;
          const next = match[u]; used[next] = true; queue.push(next);
        }
      }
    }
    return -1;
  };

  for (const root of shuffle(Array.from({ length: n }, (_, i) => i))) {
    if (match[root] !== -1) continue;
    let v = findAugmentingPath(root);
    while (v !== -1) {
      const previous = parent[v];
      const next = previous === -1 ? -1 : match[previous];
      if (previous !== -1) { match[v] = previous; match[previous] = v; }
      v = next;
    }
  }
  const pairs = [];
  for (let i = 0; i < n; i += 1) if (match[i] > i) pairs.push([ids[i], ids[match[i]]].sort());
  return { pairs, unmatched: ids.filter((_, i) => match[i] === -1) };
}

function monthIndex(period) {
  const [year, month] = period.split("-").map(Number);
  return year * 12 + month - 1;
}

async function main() {
  await initializeDatabase();
  const period = new Date().toISOString().slice(0, 7);
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`meet-and-eat-pairing-${period}`]);
    const { rows: members } = await client.query(
      `SELECT id, gender_identity, matching_frequency
       FROM members
       WHERE opted_out_at IS NULL AND profile_completed = TRUE
         AND gender_identity IN ('man', 'woman', 'non_binary', 'prefer_not_to_say')
         AND matching_frequency IN ('monthly', 'every_two_months', 'quarterly')
         AND to_char(created_at AT TIME ZONE 'UTC', 'YYYY-MM') < $1
       ORDER BY id`, [period],
    );
    const { rows: existing } = await client.query(
      "SELECT member_one, member_two FROM monthly_matches WHERE period = $1", [period],
    );
    const alreadyMatched = new Set(existing.flatMap(({ member_one, member_two }) => [member_one, member_two]));
    const { rows: priorPairs } = await client.query("SELECT member_one, member_two FROM monthly_matches");
    const forbidden = new Set(priorPairs.map(({ member_one, member_two }) => pairKey(member_one, member_two)));
    const { rows: lastMatches } = await client.query(
      `SELECT member_id, MAX(period) AS last_period FROM (
         SELECT member_one AS member_id, period FROM monthly_matches
         UNION ALL SELECT member_two AS member_id, period FROM monthly_matches
       ) all_matches GROUP BY member_id`,
    );
    const lastPeriodByMember = new Map(lastMatches.map(({ member_id, last_period }) => [member_id, last_period]));
    const eligibleByGender = new Map();
    for (const member of members) {
      if (alreadyMatched.has(member.id)) continue;
      const lastPeriod = lastPeriodByMember.get(member.id);
      const cadence = frequencyMonths[member.matching_frequency] || 1;
      if (lastPeriod && monthIndex(period) - monthIndex(lastPeriod) < cadence) continue;
      const cohort = eligibleByGender.get(member.gender_identity) || [];
      cohort.push(member.id);
      eligibleByGender.set(member.gender_identity, cohort);
    }

    let pairCount = 0;
    const unmatchedCounts = {};
    for (const [gender, ids] of eligibleByGender) {
      const result = maximumMatching(ids, forbidden);
      unmatchedCounts[gender] = result.unmatched.length;
      for (const [memberOne, memberTwo] of result.pairs) {
        await client.query(
          `INSERT INTO monthly_matches (member_one, member_two, period)
           VALUES ($1, $2, $3) ON CONFLICT (member_one, member_two, period) DO NOTHING`,
          [memberOne, memberTwo, period],
        );
        pairCount += 1;
      }
    }
    await client.query("COMMIT");
    console.log(`Pairing ${period}: created ${pairCount} fresh matches. Unmatched by gender group: ${JSON.stringify(unmatchedCounts)}.`);
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

try { await main(); } finally { await pool.end(); }
