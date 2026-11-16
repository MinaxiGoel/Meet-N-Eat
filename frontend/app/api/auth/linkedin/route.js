import { NextResponse } from "next/server";
import { SITE_URL, linkedinConfigured } from "@/lib/config";
import { authorizationUrl } from "@/lib/linkedin";
import { OAUTH_COOKIE, cookieOptions } from "@/lib/session";
import { randomToken, sign } from "@/lib/tokens";

// Starts "Continue with LinkedIn". ?intent=register|login&next=/app/profile
export async function GET(request) {
  const intent = request.nextUrl.searchParams.get("intent") === "register" ? "register" : "login";
  const nextParam = request.nextUrl.searchParams.get("next") || "";
  const next = nextParam.startsWith("/app") ? nextParam : "";
  if (!linkedinConfigured()) {
    return NextResponse.redirect(`${SITE_URL}/${intent}?error=not_configured`);
  }
  const state = randomToken();
  const response = NextResponse.redirect(authorizationUrl(state));
  response.cookies.set(OAUTH_COOKIE, sign("oauth", { s: state, i: intent, n: next }, 600), cookieOptions(600));
  return response;
}
