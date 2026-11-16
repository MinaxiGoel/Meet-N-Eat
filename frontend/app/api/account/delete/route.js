import { NextResponse } from "next/server";
import { transaction } from "@/lib/db";
import { currentPeriod } from "@/lib/dates";
import { cancelCurrentMatch } from "@/lib/participation";
import { SESSION_COOKIE, clearCookie, sessionMemberIdFromRequest } from "@/lib/session";

// Permanently delete the account and its data.
export async function POST(request) {
  const memberId = sessionMemberIdFromRequest(request);
  if (!memberId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  await transaction(async (client) => {
    await cancelCurrentMatch(client, memberId, currentPeriod());
    await client.query("DELETE FROM members WHERE id = $1", [memberId]);
  });
  const response = NextResponse.json({ ok: true });
  clearCookie(response, SESSION_COOKIE);
  return response;
}
