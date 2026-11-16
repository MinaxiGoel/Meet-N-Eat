import { test } from "node:test";
import assert from "node:assert/strict";
import { buildPairs, maximumMatching, pairKey } from "../lib/pairing.js";

const GENDERS = ["woman", "man", "non_binary", "prefer_not_to_say"];

// Brute force: the largest number of pairs possible (for small groups).
function bruteMax(ids, forbidden) {
  if (ids.length < 2) return 0;
  const [first, ...rest] = ids;
  let best = bruteMax(rest, forbidden);
  for (let i = 0; i < rest.length; i += 1) {
    if (forbidden.has(pairKey(first, rest[i]))) continue;
    best = Math.max(best, 1 + bruteMax(rest.filter((_, j) => j !== i), forbidden));
  }
  return best;
}

test("maximum matching always finds the largest number of new pairs", () => {
  for (let trial = 0; trial < 300; trial += 1) {
    const n = 2 + (trial % 9);
    const ids = Array.from({ length: n }, (_, i) => `m${i}`);
    const forbidden = new Set();
    for (let i = 0; i < n; i += 1) for (let j = i + 1; j < n; j += 1) if (Math.random() < 0.45) forbidden.add(pairKey(ids[i], ids[j]));
    const { pairs, unmatched } = maximumMatching(ids, forbidden);
    assert.equal(pairs.length, bruteMax(ids, forbidden), `trial ${trial}`);
    assert.equal(pairs.length * 2 + unmatched.length, n);
    for (const [a, b] of pairs) assert.ok(!forbidden.has(pairKey(a, b)), "used a forbidden pair");
  }
});

test("pairs are strictly same gender, never cross-gender", () => {
  for (let trial = 0; trial < 50; trial += 1) {
    const members = Array.from({ length: 40 }, (_, i) => ({ id: `p${i}`, gender: GENDERS[Math.floor(Math.random() * 4)] }));
    const genderOf = new Map(members.map((m) => [m.id, m.gender]));
    const { pairs } = buildPairs(members, new Set());
    for (const { a, b, gender } of pairs) {
      assert.equal(genderOf.get(a), genderOf.get(b));
      assert.equal(genderOf.get(a), gender);
    }
  }
});

test("a lone member of a gender is left waiting rather than paired across genders", () => {
  const { pairs, unmatched } = buildPairs([
    { id: "w1", gender: "woman" }, { id: "w2", gender: "woman" }, { id: "nb1", gender: "non_binary" },
  ], new Set());
  assert.equal(pairs.length, 1);
  assert.deepEqual(unmatched, ["nb1"]);
});

test("nobody is ever paired with the same person twice over many months", () => {
  const members = Array.from({ length: 12 }, (_, i) => ({ id: `w${String(i).padStart(2, "0")}`, gender: "woman" }));
  const history = new Set();
  for (let month = 0; month < 11; month += 1) {
    const { pairs } = buildPairs(members, history);
    for (const { a, b } of pairs) {
      assert.ok(!history.has(pairKey(a, b)), `repeat in month ${month}`);
      history.add(pairKey(a, b));
    }
  }
  assert.equal(history.size, 66); // every possible pair of 12 people used exactly once
});

test("someone who sat out last month gets priority", () => {
  for (let trial = 0; trial < 100; trial += 1) {
    const members = ["a", "b", "c", "d", "e"].map((id) => ({ id, gender: "man", priority: id === "c" }));
    const { pairs, unmatched } = buildPairs(members, new Set());
    assert.equal(pairs.length, 2);
    assert.ok(!unmatched.includes("c"));
  }
});
