export const SITE_URL = (process.env.PUBLIC_SITE_URL || "http://localhost:3000").replace(/\/$/, "");
export const IS_PROD = process.env.NODE_ENV === "production";

// Gmail allows about 500 emails in any 24 hours; keep headroom for retries.
export const EMAIL_DAILY_CAP = Number(process.env.EMAIL_DAILY_CAP || 480);
// How many emails one scheduler call may send (keeps each call short).
export const EMAIL_BATCH_SIZE = Number(process.env.EMAIL_BATCH_SIZE || 60);

export const linkedinConfigured = () =>
  Boolean(process.env.LINKEDIN_CLIENT_ID && process.env.LINKEDIN_CLIENT_SECRET);

export const linkedinRedirectUri = () => `${SITE_URL}/api/auth/linkedin/callback`;

export function sessionSecret() {
  const secret = process.env.SESSION_SECRET || "";
  if (secret.length < 32) throw new Error("SESSION_SECRET must be set to at least 32 characters.");
  return secret;
}
