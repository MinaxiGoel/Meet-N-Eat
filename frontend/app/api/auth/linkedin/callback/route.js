import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";
import { query } from "@/lib/db";
import { downloadPhoto, fetchLinkedinProfile } from "@/lib/linkedin";
import { OAUTH_COOKIE, PENDING_COOKIE, clearCookie, cookieOptions, setSession } from "@/lib/session";
import { sign, verify } from "@/lib/tokens";

const back = (intent, error) => NextResponse.redirect(`${SITE_URL}/${intent}?error=${error}`);

export async function GET(request) {
  const params = request.nextUrl.searchParams;
  const oauth = verify("oauth", request.cookies.get(OAUTH_COOKIE)?.value);
  const intent = oauth?.i === "register" ? "register" : "login";
  if (!oauth || !params.get("state") || params.get("state") !== oauth.s) return back(intent, "expired");
  if (params.get("error")) return back(intent, "linkedin_cancelled");
  const code = params.get("code");
  if (!code) return back(intent, "linkedin_failed");

  let profile;
  try {
    profile = await fetchLinkedinProfile(code);
  } catch (error) {
    console.error("[linkedin]", error.message);
    return back(intent, "linkedin_failed");
  }
  if (!profile.sub || !profile.email || !profile.emailVerified) return back(intent, "no_email");

  const { rows: [existing] } = await query(
    "SELECT id, email FROM members WHERE linkedin_sub = $1", [profile.sub],
  );

  if (existing) {
    // Keep email and photo in step with LinkedIn.
    const photo = await downloadPhoto(profile.picture);
    await query(
      `UPDATE members SET
         email = CASE WHEN NOT EXISTS (SELECT 1 FROM members o WHERE o.email = $2 AND o.id <> $1) THEN $2 ELSE email END,
         photo = COALESCE($3, photo), photo_type = COALESCE($4, photo_type), updated_at = now()
       WHERE id = $1`,
      [existing.id, profile.email, photo?.bytes || null, photo?.type || null],
    );
    const destination = oauth.n || (intent === "register" ? "/app?notice=exists" : "/app");
    const response = NextResponse.redirect(`${SITE_URL}${destination}`);
    setSession(response, existing.id);
    clearCookie(response, OAUTH_COOKIE);
    clearCookie(response, PENDING_COOKIE);
    return response;
  }

  const { rows: [emailTaken] } = await query("SELECT 1 FROM members WHERE email = $1", [profile.email]);
  if (emailTaken) return back("register", "email_taken");

  // New member: remember their LinkedIn details for 30 minutes while they fill in the form.
  const response = NextResponse.redirect(`${SITE_URL}/register`);
  response.cookies.set(PENDING_COOKIE, sign("pending", {
    sub: profile.sub, email: profile.email, firstName: profile.firstName,
    lastName: profile.lastName, picture: profile.picture,
  }, 1800), cookieOptions(1800));
  clearCookie(response, OAUTH_COOKIE);
  return response;
}
