import { NextResponse } from "next/server";
import { query } from "@/lib/db";
import { isValidTimeZone } from "@/lib/dates";
import { downloadPhoto } from "@/lib/linkedin";
import { PENDING_COOKIE, REF_COOKIE, clearCookie, setSession } from "@/lib/session";
import { referralCode, verify } from "@/lib/tokens";
import { validateProfile } from "@/lib/validate";

export async function POST(request) {
  const pending = verify("pending", request.cookies.get(PENDING_COOKIE)?.value);
  if (!pending) {
    return NextResponse.json({ error: "Your LinkedIn sign-in timed out. Please continue with LinkedIn again.", restart: true }, { status: 401 });
  }
  const body = await request.json().catch(() => ({}));
  const { values, errors, ok } = validateProfile(body, { requireConsent: true });
  if (!ok) return NextResponse.json({ errors }, { status: 400 });

  const { rows: [duplicate] } = await query(
    "SELECT 1 FROM members WHERE linkedin_sub = $1 OR email = $2", [pending.sub, pending.email],
  );
  if (duplicate) {
    return NextResponse.json({ error: "This email already has an account. You can only create one account per email." }, { status: 409 });
  }

  const timezone = isValidTimeZone(body.timezone) ? body.timezone : "UTC";
  const refCode = request.cookies.get(REF_COOKIE)?.value || null;
  const photo = await downloadPhoto(pending.picture);

  let memberId;
  for (let attempt = 0; attempt < 3 && !memberId; attempt += 1) {
    try {
      const { rows } = await query(
        `INSERT INTO members (linkedin_sub, email, first_name, last_name, gender, job_title, company,
           linkedin_url, fun_facts, timezone, photo, photo_type, referral_code, referred_by,
           age_confirmed_at, terms_accepted_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
           (SELECT id FROM members WHERE referral_code = $14), now(), now())
         RETURNING id`,
        [pending.sub, pending.email, values.firstName, values.lastName, values.gender, values.jobTitle,
          values.company, values.linkedinUrl, values.funFacts, timezone, photo?.bytes || null,
          photo?.type || null, referralCode(), refCode],
      );
      memberId = rows[0].id;
    } catch (error) {
      if (error.code !== "23505" || !String(error.constraint || "").includes("referral_code")) throw error;
    }
  }

  const response = NextResponse.json({ ok: true });
  setSession(response, memberId);
  clearCookie(response, PENDING_COOKIE);
  clearCookie(response, REF_COOKIE);
  return response;
}
