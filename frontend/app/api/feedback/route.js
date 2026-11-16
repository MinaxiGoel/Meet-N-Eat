import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { sessionMemberIdFromRequest } from "@/lib/session";

export async function POST(request) {
  const memberId = sessionMemberIdFromRequest(request);
  if (!memberId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const body = await request.json().catch(() => ({}));
  const met = ["yes", "not_yet", "could_not"].includes(body.met) ? body.met : null;
  const rating = Number.isInteger(body.rating) && body.rating >= 1 && body.rating <= 5 ? body.rating : null;
  const comment = String(body.comment || "").trim().slice(0, 2000) || null;
  const isConcern = body.isConcern === true;
  if (!met && !rating && !comment) return NextResponse.json({ error: "Tell us a little something first 🙂" }, { status: 400 });

  // Only accept a match id that belongs to this member.
  let matchId = null;
  if (body.matchId) {
    const { rows } = await query(
      "SELECT id FROM matches WHERE id = $1 AND (member_low = $2 OR member_high = $2)", [body.matchId, memberId],
    );
    matchId = rows[0]?.id || null;
  }
  await query(
    "INSERT INTO feedback (member_id, match_id, met, rating, comment, is_concern) VALUES ($1, $2, $3, $4, $5, $6)",
    [memberId, matchId, met, rating, comment, isConcern],
  );
  if (isConcern) console.warn(`[concern] reported by ${memberId} about match ${matchId || "(none)"}`);
  return NextResponse.json({ ok: true });
}
