import { test } from "node:test";
import assert from "node:assert/strict";
import {
  currentPeriod, nextPeriod, previousPeriod, round1At, round2At, localDayInPeriod, isLocalTimeReached, monthLabel,
} from "../lib/dates.js";

test("periods", () => {
  assert.equal(currentPeriod(new Date("2026-12-31T23:59:00Z")), "2026-12-01");
  assert.equal(nextPeriod("2026-12-01"), "2027-01-01");
  assert.equal(previousPeriod("2027-01-01"), "2026-12-01");
  assert.equal(monthLabel("2026-12-01"), "December");
});

test("round 1 starts exactly when the 8th begins in the earliest time zone", () => {
  const at = round1At("2026-12-01");
  assert.equal(at.toISOString(), "2026-12-07T10:00:00.000Z");
  assert.equal(localDayInPeriod(at, "Pacific/Kiritimati", "2026-12-01"), 8);
  assert.equal(round2At("2026-12-01").toISOString(), "2026-12-11T10:00:00.000Z");
});

test("emails go out at 09:00 in each member's own time zone", () => {
  const period = "2026-12-01";
  // 03:30 UTC on the 3rd = 09:00 in India
  assert.equal(isLocalTimeReached(new Date("2026-12-03T03:30:00Z"), "Asia/Kolkata", period, 3, 9), true);
  assert.equal(isLocalTimeReached(new Date("2026-12-03T03:29:00Z"), "Asia/Kolkata", period, 3, 9), false);
  // Los Angeles is UTC-8 in December: 09:00 local = 17:00 UTC
  assert.equal(isLocalTimeReached(new Date("2026-12-03T16:59:00Z"), "America/Los_Angeles", period, 3, 9), false);
  assert.equal(isLocalTimeReached(new Date("2026-12-03T17:00:00Z"), "America/Los_Angeles", period, 3, 9), true);
  // Later days count too (roll-over)
  assert.equal(isLocalTimeReached(new Date("2026-12-05T01:00:00Z"), "America/Los_Angeles", period, 3, 9), true);
  // Bad time zone falls back to UTC
  assert.equal(isLocalTimeReached(new Date("2026-12-03T09:00:00Z"), "Not/AZone", period, 3, 9), true);
});

test("local month before/after the period", () => {
  assert.equal(localDayInPeriod(new Date("2026-12-01T02:00:00Z"), "America/Los_Angeles", "2026-12-01"), -Infinity);
  assert.equal(localDayInPeriod(new Date("2026-12-31T20:00:00Z"), "Pacific/Kiritimati", "2026-12-01"), Infinity);
});
