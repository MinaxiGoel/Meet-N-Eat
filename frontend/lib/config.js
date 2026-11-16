// The site's public address. On Vercel this is picked up automatically from the
// production domain (so renaming the domain or adding a custom one just works).
// SITE_URL overrides it if ever needed.
function siteUrl() {
  if (process.env.SITE_URL) return process.env.SITE_URL;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return process.env.PUBLIC_SITE_URL || "http://localhost:3000";
}
export const SITE_URL = siteUrl().replace(/\/$/, "");
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
