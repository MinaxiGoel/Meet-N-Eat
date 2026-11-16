import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";
import { REF_COOKIE, cookieOptions } from "@/lib/session";

// Referral link: /r/{code} remembers who invited you for 30 days.
export async function GET(_request, { params }) {
  const { code } = await params;
  const response = NextResponse.redirect(`${SITE_URL}/`);
  if (/^[a-z0-9]{6,12}$/.test(code)) response.cookies.set(REF_COOKIE, code, cookieOptions(60 * 60 * 24 * 30));
  return response;
}
