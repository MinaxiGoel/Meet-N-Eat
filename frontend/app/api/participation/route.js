import { NextResponse } from "next/server";
import { ACTIONS, setChoice } from "@/lib/participation";
import { sessionMemberIdFromRequest } from "@/lib/session";

// Settings: stay | break | pause | leave | back
export async function POST(request) {
  const memberId = sessionMemberIdFromRequest(request);
  if (!memberId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const { action } = await request.json().catch(() => ({}));
  if (!ACTIONS.includes(action)) return NextResponse.json({ error: "Please choose an option." }, { status: 400 });
  return NextResponse.json(await setChoice(memberId, action, "site"));
}
