import { NextResponse } from "next/server";
import { setChoice } from "@/lib/participation";
import { verify } from "@/lib/tokens";

const EMAIL_ACTIONS = ["break", "pause", "leave", "back"];

// The one "Confirm" tap from the check-in email. No login needed: the signed link proves who it is.
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const token = verify("choice", body.t);
  if (!token) return NextResponse.json({ error: "This link has expired. You can still change this in Settings." }, { status: 400 });
  if (!EMAIL_ACTIONS.includes(body.a)) return NextResponse.json({ error: "Unknown choice." }, { status: 400 });
  try {
    return NextResponse.json(await setChoice(token.m, body.a, "email"));
  } catch {
    return NextResponse.json({ error: "We couldn't find your account." }, { status: 404 });
  }
}
