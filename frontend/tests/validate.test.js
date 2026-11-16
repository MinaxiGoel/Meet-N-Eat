import { test } from "node:test";
import assert from "node:assert/strict";
import { normaliseLinkedinUrl, validateProfile } from "../lib/validate.js";

test("LinkedIn links are tidied into one clickable format", () => {
  assert.equal(normaliseLinkedinUrl("linkedin.com/in/minaxi-goel"), "https://www.linkedin.com/in/minaxi-goel");
  assert.equal(normaliseLinkedinUrl("https://in.linkedin.com/in/minaxi-goel/?trk=x"), "https://www.linkedin.com/in/minaxi-goel");
  assert.equal(normaliseLinkedinUrl("https://evil.com/in/x"), null);
  assert.equal(normaliseLinkedinUrl("https://linkedin.com/company/acme"), null);
  assert.equal(normaliseLinkedinUrl(""), "");
});

test("sign-up needs every field, 18+ and consent", () => {
  const good = {
    firstName: "Asha", lastName: "Rao", gender: "woman", jobTitle: "Designer", company: "Lumen",
    linkedinUrl: "linkedin.com/in/asha", funFacts: "Pet lover and coffee person", ageConfirmed: true, termsAccepted: true,
  };
  assert.equal(validateProfile(good, { requireConsent: true }).ok, true);
  const bad = validateProfile({ ...good, gender: "other", funFacts: "hi", ageConfirmed: false }, { requireConsent: true });
  assert.deepEqual(Object.keys(bad.errors).sort(), ["ageConfirmed", "funFacts", "gender"]);
});
