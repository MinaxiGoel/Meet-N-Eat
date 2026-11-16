// Shared by the browser (instant checks) and the server (final checks).

export const GENDERS = [
  { value: "woman", label: "Woman" },
  { value: "man", label: "Man" },
  { value: "non_binary", label: "Non-binary" },
  { value: "prefer_not_to_say", label: "Prefer not to say" },
];
const GENDER_VALUES = new Set(GENDERS.map((g) => g.value));
export const genderLabel = (value) => GENDERS.find((g) => g.value === value)?.label || "";

export function normaliseLinkedinUrl(input) {
  let value = String(input || "").trim();
  if (!value) return "";
  if (!/^https?:\/\//i.test(value)) value = `https://${value}`;
  let url;
  try { url = new URL(value); } catch { return null; }
  const host = url.hostname.toLowerCase();
  if (host !== "linkedin.com" && !host.endsWith(".linkedin.com")) return null;
  const match = url.pathname.match(/^\/in\/([^/]+)\/?$/i);
  if (!match) return null;
  return `https://www.linkedin.com/in/${match[1]}`;
}

const clean = (value) => String(value ?? "").replace(/\s+/g, " ").trim();

const LIMITS = {
  firstName: [1, 50], lastName: [1, 50], jobTitle: [2, 80], company: [1, 80], funFacts: [10, 200],
};

export function validateProfile(input, { requireConsent = false } = {}) {
  const values = {
    firstName: clean(input.firstName),
    lastName: clean(input.lastName),
    gender: String(input.gender || ""),
    jobTitle: clean(input.jobTitle),
    company: clean(input.company),
    funFacts: String(input.funFacts ?? "").trim(),
    linkedinUrl: normaliseLinkedinUrl(input.linkedinUrl),
  };
  const errors = {};
  const labels = {
    firstName: "First name", lastName: "Last name", jobTitle: "Current role", company: "Company",
    funFacts: "This",
  };
  for (const [field, [min, max]] of Object.entries(LIMITS)) {
    const length = values[field].length;
    if (!length) errors[field] = `${labels[field]} is needed.`;
    else if (length < min) errors[field] = `Please write at least ${min} characters.`;
    else if (length > max) errors[field] = `Please keep it under ${max} characters.`;
  }
  if (!GENDER_VALUES.has(values.gender)) errors.gender = "Please choose one option.";
  if (values.linkedinUrl === "") errors.linkedinUrl = "Your LinkedIn profile link is needed.";
  else if (values.linkedinUrl === null) errors.linkedinUrl = "Please paste a link like linkedin.com/in/your-name.";
  if (requireConsent) {
    if (input.ageConfirmed !== true) errors.ageConfirmed = "You need to be 18 or older to join.";
    if (input.termsAccepted !== true) errors.termsAccepted = "Please agree to continue.";
  }
  return { values, errors, ok: Object.keys(errors).length === 0 };
}
