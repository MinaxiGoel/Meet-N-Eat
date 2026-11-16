import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { currentPeriod } from "@/lib/dates";
import { getMemberRow, toPartner } from "@/lib/members";
import { sessionMemberIdFromRequest } from "@/lib/session";
import { getCurrentMatch, isRevealOpen } from "@/lib/view";

// Flip the plate: mark this month's match as revealed and return the partner.
export async function POST(request) {
  const memberId = sessionMemberIdFromRequest(request);
  const member = await getMemberRow(memberId);
  if (!member) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const match = await getCurrentMatch(member.id, currentPeriod());
  if (!match) return NextResponse.json({ error: "There's no match to reveal right now." }, { status: 404 });
  if (!isRevealOpen(match, member.timezone)) {
    return NextResponse.json({ error: "Your match unlocks on the 8th. Stay tuned!" }, { status: 403 });
  }
  if (!match.revealedAt) {
    await query(
      `UPDATE matches SET ${match.isLow ? "revealed_low" : "revealed_high"} = now() WHERE id = $1`,
      [match.id],
    );
  }
  return NextResponse.json({ partner: toPartner(match.partnerRow) });
}
