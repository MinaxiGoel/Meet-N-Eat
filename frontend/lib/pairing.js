import { randomInt } from "node:crypto";

// Pairing rules (PRD 14.3):
// - Strictly same gender: we only ever look inside one gender group at a time.
// - Never repeat a pair.
// - Make as many new pairs as possible (maximum matching).
// - If someone must sit out, prefer someone who did NOT sit out last month.

export const pairKey = (a, b) => (a < b ? `${a}:${b}` : `${b}:${a}`);

function shuffle(values, random = randomInt) {
  const result = [...values];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = random(i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Edmonds' blossom algorithm: maximum-cardinality matching in a general graph.
// Edges exist only between people who have never been paired before.
export function maximumMatching(vertices, forbiddenPairs, random = randomInt) {
  const ids = shuffle(vertices, random);
  const n = ids.length;
  const graph = Array.from({ length: n }, () => []);
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      if (!forbiddenPairs.has(pairKey(ids[i], ids[j]))) { graph[i].push(j); graph[j].push(i); }
    }
  }
  for (const neighbours of graph) neighbours.splice(0, neighbours.length, ...shuffle(neighbours, random));

  const match = Array(n).fill(-1);
  const parent = Array(n).fill(-1);
  const base = Array.from({ length: n }, (_, i) => i);
  const used = Array(n).fill(false);
  const blossom = Array(n).fill(false);

  const lca = (a, b) => {
    const seen = Array(n).fill(false);
    for (;;) {
      a = base[a]; seen[a] = true;
      if (match[a] === -1) break;
      a = parent[match[a]];
    }
    for (;;) {
      b = base[b];
      if (seen[b]) return b;
      b = parent[match[b]];
    }
  };
  const markPath = (v, b, child) => {
    while (base[v] !== b) {
      blossom[base[v]] = true; blossom[base[match[v]]] = true;
      parent[v] = child; child = match[v]; v = parent[match[v]];
    }
  };
  const findPath = (root) => {
    used.fill(false); parent.fill(-1);
    for (let i = 0; i < n; i += 1) base[i] = i;
    const queue = [root]; used[root] = true;
    for (let head = 0; head < queue.length; head += 1) {
      const v = queue[head];
      for (const u of graph[v]) {
        if (base[v] === base[u] || match[v] === u) continue;
        if (u === root || (match[u] !== -1 && parent[match[u]] !== -1)) {
          const current = lca(v, u);
          blossom.fill(false);
          markPath(v, current, u); markPath(u, current, v);
          for (let i = 0; i < n; i += 1) {
            if (blossom[base[i]]) {
              base[i] = current;
              if (!used[i]) { used[i] = true; queue.push(i); }
            }
          }
        } else if (parent[u] === -1) {
          parent[u] = v;
          if (match[u] === -1) return u;
          used[match[u]] = true; queue.push(match[u]);
        }
      }
    }
    return -1;
  };

  for (const root of shuffle(Array.from({ length: n }, (_, i) => i), random)) {
    if (match[root] !== -1) continue;
    let v = findPath(root);
    while (v !== -1) {
      const pv = parent[v];
      const ppv = match[pv];
      match[v] = pv; match[pv] = v;
      v = ppv;
    }
  }

  const pairs = [];
  for (let i = 0; i < n; i += 1) if (match[i] > i) pairs.push([ids[i], ids[match[i]]].sort());
  return { pairs, unmatched: ids.filter((_, i) => match[i] === -1) };
}

// Pair one gender group, preferring to keep "priority" people (who sat out last month) in.
function pairGroup(ids, forbidden, priority, random) {
  let best = maximumMatching(ids, forbidden, random);
  const leftOutPriority = () => best.unmatched.filter((id) => priority.has(id)).length;
  if (!leftOutPriority()) return best;

  // Try leaving out a non-priority person instead, without losing any pairs.
  const candidates = shuffle(ids.filter((id) => !priority.has(id)), random).slice(0, 25);
  for (const sitOut of candidates) {
    const attempt = maximumMatching(ids.filter((id) => id !== sitOut), forbidden, random);
    if (attempt.pairs.length < best.pairs.length) continue;
    const unmatched = [...attempt.unmatched, sitOut];
    const missedPriority = unmatched.filter((id) => priority.has(id)).length;
    if (missedPriority < leftOutPriority()) best = { pairs: attempt.pairs, unmatched };
    if (!missedPriority) break;
  }
  return best;
}

/**
 * members: [{ id, gender, priority }]
 * forbiddenPairs: Set of pairKey() for every pair that has ever been matched
 * Returns { pairs: [{ a, b, gender }], unmatched: [id], byGender: { gender: { eligible, matched, waiting } } }
 */
export function buildPairs(members, forbiddenPairs, random = randomInt) {
  const groups = new Map();
  for (const member of members) {
    if (!member.gender) continue;
    if (!groups.has(member.gender)) groups.set(member.gender, []);
    groups.get(member.gender).push(member);
  }
  const pairs = [];
  const unmatched = [];
  const byGender = {};
  for (const [gender, group] of groups) {
    const priority = new Set(group.filter((m) => m.priority).map((m) => m.id));
    const result = pairGroup(group.map((m) => m.id), forbiddenPairs, priority, random);
    for (const [a, b] of result.pairs) pairs.push({ a, b, gender });
    unmatched.push(...result.unmatched);
    byGender[gender] = { eligible: group.length, matched: result.pairs.length * 2, waiting: result.unmatched.length };
  }
  return { pairs, unmatched, byGender };
}
