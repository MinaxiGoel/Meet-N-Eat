import { NextResponse } from "next/server";
import { SESSION_COOKIE, clearCookie } from "@/lib/session";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  clearCookie(response, SESSION_COOKIE);
  return response;
}
