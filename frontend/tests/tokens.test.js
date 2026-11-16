import { test } from "node:test";
import assert from "node:assert/strict";

process.env.SESSION_SECRET = "test-secret-test-secret-test-secret-123";
const { sign, verify } = await import("../lib/tokens.js");

test("signed links can't be forged or reused for something else", () => {
  const token = sign("choice", { m: "member-1" }, 60);
  assert.equal(verify("choice", token).m, "member-1");
  assert.equal(verify("session", token), null);
  const [body, mac] = token.split(".");
  const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(body, "base64url")), m: "member-2" })).toString("base64url");
  assert.equal(verify("choice", `${forged}.${mac}`), null);
  assert.equal(verify("choice", sign("choice", { m: "x" }, -1)), null);
  assert.equal(verify("choice", "garbage"), null);
});
