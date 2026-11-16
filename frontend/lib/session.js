import { cookies } from "next/headers";
import { IS_PROD } from "./config.js";
import { sign, verify } from "./tokens.js";

export const SESSION_COOKIE = "mne_session";
export const PENDING_COOKIE = "mne_pending";
export const OAUTH_COOKIE = "mne_oauth";
export const REF_COOKIE = "mne_ref";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

export const cookieOptions = (maxAge) => ({
  httpOnly: true, secure: IS_PROD, sameSite: "lax", path: "/", maxAge,
});

export function setSession(response, memberId) {
  response.cookies.set(SESSION_COOKIE, sign("session", { m: memberId }, THIRTY_DAYS), cookieOptions(THIRTY_DAYS));
}

export function clearCookie(response, name) {
  response.cookies.set(name, "", cookieOptions(0));
}

// Route handlers: pass the incoming request.
export function sessionMemberIdFromRequest(request) {
  return verify("session", request.cookies.get(SESSION_COOKIE)?.value)?.m || null;
}

// Server components: read cookies from the current request.
export async function currentMemberId() {
  const store = await cookies();
  return verify("session", store.get(SESSION_COOKIE)?.value)?.m || null;
}

export async function pendingSignup() {
  const store = await cookies();
  return verify("pending", store.get(PENDING_COOKIE)?.value);
}
