import { linkedinRedirectUri } from "./config.js";

// Sign In with LinkedIn using OpenID Connect.
// Docs: https://learn.microsoft.com/linkedin/consumer/integrations/self-serve/sign-in-with-linkedin-v2

export function authorizationUrl(state) {
  const url = new URL("https://www.linkedin.com/oauth/v2/authorization");
  url.search = new URLSearchParams({
    response_type: "code",
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: linkedinRedirectUri(),
    state,
    scope: "openid profile email",
  }).toString();
  return url.toString();
}

// Swap the one-time code for the member's LinkedIn details.
// This happens server-to-server with our client secret, so the answer can be trusted.
export async function fetchLinkedinProfile(code) {
  const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: linkedinRedirectUri(),
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!tokenResponse.ok) throw new Error(`LinkedIn token exchange failed (${tokenResponse.status})`);
  const { access_token: accessToken } = await tokenResponse.json();

  const infoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(10_000),
  });
  if (!infoResponse.ok) throw new Error(`LinkedIn userinfo failed (${infoResponse.status})`);
  const info = await infoResponse.json();
  // The access token is not stored anywhere.
  return {
    sub: info.sub,
    email: info.email || null,
    emailVerified: info.email_verified !== false,
    firstName: info.given_name || "",
    lastName: info.family_name || "",
    picture: info.picture || null,
  };
}

// Download the LinkedIn photo so we keep our own copy (LinkedIn photo links expire).
export async function downloadPhoto(pictureUrl) {
  if (!pictureUrl || !/^https:\/\//.test(pictureUrl)) return null;
  try {
    const response = await fetch(pictureUrl, { signal: AbortSignal.timeout(6_000) });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") || "image/jpeg";
    if (!type.startsWith("image/")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (!bytes.length || bytes.length > 1_500_000) return null;
    return { bytes, type };
  } catch {
    return null;
  }
}
