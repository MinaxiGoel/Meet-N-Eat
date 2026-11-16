import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/config";
import { setChoice } from "@/lib/participation";
import { verify } from "@/lib/tokens";

// Gmail's built-in "Unsubscribe" button (one-click POST, RFC 8058) = Opt out.
export async function POST(request) {
  const token = verify("choice", request.nextUrl.searchParams.get("t"));
  if (!token) return new NextResponse("Link expired", { status: 400 });
  try { await setChoice(token.m, "leave", "email"); } catch { /* already gone */ }
  return new NextResponse("You've been unsubscribed from Meet-N-Eat.", { status: 200 });
}

// Someone opening the link in a browser gets the normal confirm page.
export async function GET(request) {
  const t = request.nextUrl.searchParams.get("t") || "";
  return NextResponse.redirect(`${SITE_URL}/choice?t=${encodeURIComponent(t)}&a=leave`);
}
