import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isValidTimeZone } from "@/lib/dates";
import { getMemberRow, toMember } from "@/lib/members";
import { sessionMemberIdFromRequest } from "@/lib/session";
import { validateProfile } from "@/lib/validate";

export async function GET(request) {
  const member = toMember(await getMemberRow(sessionMemberIdFromRequest(request)));
  if (!member) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  return NextResponse.json({ member });
}

// Edit profile.
export async function PATCH(request) {
  const memberId = sessionMemberIdFromRequest(request);
  if (!memberId) return NextResponse.json({ error: "Please log in." }, { status: 401 });
  const body = await request.json().catch(() => ({}));

  if (body.removePhoto === true) {
    await query("UPDATE members SET photo = NULL, photo_type = NULL, updated_at = now() WHERE id = $1", [memberId]);
    return NextResponse.json({ member: toMember(await getMemberRow(memberId)) });
  }

  const { values, errors, ok } = validateProfile(body);
  if (body.timezone !== undefined && !isValidTimeZone(body.timezone)) errors.timezone = "Please choose a time zone.";
  if (!ok || errors.timezone) return NextResponse.json({ errors }, { status: 400 });

  await query(
    `UPDATE members SET first_name = $2, last_name = $3, gender = $4, job_title = $5, company = $6,
       linkedin_url = $7, fun_facts = $8, timezone = COALESCE($9, timezone), updated_at = now()
     WHERE id = $1`,
    [memberId, values.firstName, values.lastName, values.gender, values.jobTitle, values.company,
      values.linkedinUrl, values.funFacts, body.timezone || null],
  );
  return NextResponse.json({ member: toMember(await getMemberRow(memberId)) });
}
